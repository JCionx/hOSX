from flask import Flask, redirect, render_template, request, session, send_from_directory, abort
from flask_session import Session
from helpers import login_required
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import shutil
import os
import base64

app = Flask(__name__)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 * 1024 # 16 GB
Session(app)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

@app.route("/")
@login_required
def index():
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":

        # Get the form fields from the login page
        username = request.form.get("username")
        password = request.form.get("password")

        # Get all the usernames in the database
        conn = get_db_connection()
        usernames = conn.execute("SELECT username FROM users").fetchall()
        conn.close()

        # Throw an error if the user did not insert a username
        if not username:
            return render_template("login.html", error="Please insert a username")
        
        # Throw an error if the user did not insert a password
        if not password:
            return render_template("login.html", error="Please insert a password")
        
        # Throw an error if the user inserted an existing username
        if not any(user["username"] == username for user in usernames):
            return render_template("login.html", error="That username does not exist")
        
        # Hash the password
        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()
        hash = user["hash"]

        if not check_password_hash(hash, password):
            return render_template("login.html", error="The password is incorrect")
        
        # Add the user id to the session
        session["user_id"] = user["id"]

        # Redirect to the index page
        return redirect("/")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":

        # Get the form fields from the login page
        username = request.form.get("username")
        password = request.form.get("password")
        confirmation = request.form.get("confirmation")

        # Get all the usernames in the database
        conn = get_db_connection()
        usernames = conn.execute("SELECT username FROM users").fetchall()
        conn.close()

        # Throw an error if the user did not insert a username
        if not username:
            return render_template("register.html", error="Please insert a username")
        
        # Throw an error if the user did not insert a password
        if not password:
            return render_template("register.html", error="Please insert a password")
        
        # Throw an error if the user did not insert a confirmation password
        if not confirmation:
            return render_template("register.html", error="Please insert a password confirmation")
        
        # Throw an error if the user inserted an existing username
        if any(user["username"] == username for user in usernames):
            return render_template("register.html", error="That username already exists")
        
        # Throw an error if the passwords do not match
        if not password == confirmation:
            return render_template("register.html", error="Passwords don't match")
        
        # Throw an error if the username is less than 3 characters long
        if len(username) < 3:
            return render_template("register.html", error="Username must be at least 3 characters long")
        
        # Throw an error if the username is longer than 32 characters
        if len(username) > 32:
            return render_template("register.html", error="Username can't be longer than 32 characters")

        # Throw an error if the password is less than 6 characters long
        if len(password) < 6:
            return render_template("register.html", error="Password must be at least 6 characters long")
        
        # Throw an error if the password is longer than 64 characters
        if len(password) > 64:
            return render_template("register.html", error="Password can't be longer than 64 characters")
        
        # Hash the password
        hash = generate_password_hash(password)

        # Add the new user to the database
        conn = get_db_connection()
        conn.execute("INSERT INTO users (username, hash) VALUES(?, ?)", (username, hash))
        conn.commit()

        user_id = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()["id"]

        default_dir = "default" 
        user_dir = f"data/{user_id}"

        os.makedirs(user_dir, exist_ok=True)

        # Clone the contents of the default folder into the user folder
        for item in os.listdir(default_dir):
            s = os.path.join(default_dir, item)
            d = os.path.join(user_dir, item)
            
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)

        conn.close()

        # Redirect to the login page
        return redirect("/login")

    return render_template("register.html")

@app.route("/logout")
def logout():

    # Clear the session
    session.clear()

    # Redirect to the login page
    return redirect("/login")

# Serve application files
@app.route("/app/<app_name>/<path:filename>")
@login_required
def serve_application(app_name, filename):
    user_id = session.get("user_id")
    if not user_id:
        abort(403)
    app_folder = f"data/{user_id}/Applications/{app_name}"
    if not os.path.exists(app_folder):
        abort(404)
    return send_from_directory(app_folder, filename)

@app.route("/list", methods=["POST"])
@login_required
def list():
    path = request.form.get("path")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)
    user_folder = f"data/{user_id}"
    if path == "/":
        path = user_folder
    else:
        path = os.path.join(user_folder, path.lstrip("/"))
    if not os.path.exists(path):
        abort(404)
    files = os.listdir(path)
    files_list = []
    dirs_list = []
    for item in files:
        if os.path.isfile(os.path.join(path, item)):
            files_list.append(item)
        elif os.path.isdir(os.path.join(path, item)):
            dirs_list.append(item)
    return {"files": files_list, "directories": dirs_list}

@app.route("/new_folder", methods=["POST"])
@login_required
def new_folder():
    path = request.form.get("path")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)
    user_folder = f"data/{user_id}"
    if path == "/":
        full_path = user_folder
    else:
        full_path = os.path.normpath(os.path.join(user_folder, path.lstrip("/")))
    if not full_path.startswith(user_folder):
        abort(403)
    try:
        os.mkdir(full_path)
    except FileExistsError:
        return {"status": "error", "message": "Folder already exists"}, 400
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/delete_folder", methods=["POST"])
@login_required
def delete_folder():
    path = request.form.get("path")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)
    user_folder = f"data/{user_id}"
    if path == "/":
        return {"status": "error", "message": "Cannot delete root folder"}, 400
    full_path = os.path.normpath(os.path.join(user_folder, path.lstrip("/")))
    if not full_path.startswith(user_folder):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "Folder does not exist"}, 404
    try:
        shutil.rmtree(full_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/copy_folder", methods=["POST"])
@login_required
def copy_folder():
    path = request.form.get("path")
    dest = request.form.get("dest")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)

    user_folder = f"data/{user_id}"
    full_path = os.path.normpath(os.path.join(user_folder, path.lstrip("/")))
    dest_path = os.path.normpath(os.path.join(user_folder, dest.lstrip("/")))

    if not full_path.startswith(user_folder) or not dest_path.startswith(user_folder):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "Source folder does not exist"}, 404
    if os.path.exists(dest_path):
        return {"status": "error", "message": "Destination folder already exists"}, 400

    try:
        shutil.copytree(full_path, dest_path)
    except Exception as e:

        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/move_folder", methods=["POST"])
@login_required
def move_folder():
    path = request.form.get("path")
    dest = request.form.get("dest")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)

    user_folder = f"data/{user_id}"
    full_path = os.path.normpath(os.path.join(user_folder, path.lstrip("/")))
    dest_path = os.path.normpath(os.path.join(user_folder, dest.lstrip("/")))

    if not full_path.startswith(user_folder) or not dest_path.startswith(user_folder):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "Source folder does not exist"}, 404
    if os.path.exists(dest_path):
        return {"status": "error", "message": "Destination folder already exists"}, 400

    try:
        shutil.move(full_path, dest_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/delete_file", methods=["POST"])
@login_required
def delete_file():
    path = request.form.get("path")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)
    user_file = f"data/{user_id}"
    full_path = os.path.normpath(os.path.join(user_file, path.lstrip("/")))
    if not full_path.startswith(user_file):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "File does not exist"}, 404
    try:
        os.remove(full_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/copy_file", methods=["POST"])
@login_required
def copy_file():
    path = request.form.get("path")
    dest = request.form.get("dest")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)

    user_file = f"data/{user_id}"
    full_path = os.path.normpath(os.path.join(user_file, path.lstrip("/")))
    dest_path = os.path.normpath(os.path.join(user_file, dest.lstrip("/")))

    if not full_path.startswith(user_file) or not dest_path.startswith(user_file):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "Source file does not exist"}, 404
    if os.path.exists(dest_path):
        return {"status": "error", "message": "Destination file already exists"}, 400

    try:
        shutil.copy2(full_path, dest_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}

@app.route("/move_file", methods=["POST"])
@login_required
def move_file():
    path = request.form.get("path")
    dest = request.form.get("dest")
    user_id = session.get("user_id")
    if not user_id:
        abort(403)

    user_file = f"data/{user_id}"
    full_path = os.path.normpath(os.path.join(user_file, path.lstrip("/")))
    dest_path = os.path.normpath(os.path.join(user_file, dest.lstrip("/")))

    if not full_path.startswith(user_file) or not dest_path.startswith(user_file):
        abort(403)
    if not os.path.exists(full_path):
        return {"status": "error", "message": "Source file does not exist"}, 404
    if os.path.exists(dest_path):
        return {"status": "error", "message": "Destination file already exists"}, 400

    try:
        shutil.move(full_path, dest_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
    return {"status": "success"}


@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    user_id = session.get("user_id")
    if not user_id:
        abort(403)

    user_folder = f"data/{user_id}"

    if 'files' not in request.files:
        return {"status": "error", "message": "No file part"}, 400

    files = request.files.getlist('files')
    if not files:
        return {"status": "error", "message": "No selected files"}, 400

    saved_files = []
    for file in files:
        if file.filename == '':
            continue
        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(user_folder, filename)
            if os.path.isdir(file_path):
                return {"status": "error", "message": "Folder uploads are not supported"}, 400
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            saved_files.append(filename)

    if not saved_files:
        return {"status": "error", "message": "No files were saved"}, 400

    return {"status": "success", "filenames": saved_files}, 200

if __name__ == "__main__":
    app.run(debug=True)

if __name__ == "__main__":
    app.run(debug=True)
