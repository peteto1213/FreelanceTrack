# FreelanceTrack on a Linux server

This guide is for a first install. You type each command, wait for it to finish, then type the next one. You do not need to know Docker before you start.

You will end up with the website on port **3030**. Sign in with the username and password you choose in step 5. There is no registration page.

The commands below are for **Ubuntu 22.04 or 24.04**. On the server, a line that starts with `sudo` will ask for your Linux password. Nothing is printed as you type that password. Press Enter when you are done.

## 1. Check that you are on the server

Open a terminal on the Linux server. This can be an SSH window from your own computer.

```bash
whoami
hostname
```

`whoami` prints your Linux username. Remember it. You will need a browser on your own computer later. The browser does not have to be on the server.

## 2. Install Git and Docker

Copy this whole block, paste it into the terminal, and press Enter.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

What that does:

- `apt update` refreshes the list of installable packages.
- `apt install` installs Git, Docker, and the `docker compose` command.
- `systemctl enable --now docker` starts Docker now and again after a reboot.
- `usermod` lets your user run Docker without `sudo`.

Log out of the server and log back in so the Docker permission applies. If you are using SSH, type:

```bash
exit
```

Connect again, then check Docker:

```bash
docker version
docker compose version
```

Both commands should print a version. If `docker version` says permission denied, you are still in the old login. Disconnect and connect again.

## 3. Put the project on the server

You need the FreelanceTrack folder on the server. Use **one** of the two ways below.

### Way A — copy it from your own computer

On your own computer, in a terminal, from the folder that **contains** `FreelanceTrack`:

```bash
scp -r FreelanceTrack YOUR_USER@YOUR_SERVER_IP:~/
```

Replace `YOUR_USER` with the name from `whoami`, and `YOUR_SERVER_IP` with the server address. Example:

```bash
scp -r FreelanceTrack demo@203.0.113.10:~/
```

Then, on the server:

```bash
cd ~/FreelanceTrack
pwd
ls
```

`pwd` should end in `/FreelanceTrack`. `ls` should show `docker-compose.yml`, `.env.example`, `client`, and `server`.

### Way B — clone it with Git

On the server, only if the project already has a Git address:

```bash
cd ~
git clone YOUR_GIT_URL
cd FreelanceTrack
```

Replace `YOUR_GIT_URL` with the real address, then run `ls` and confirm `docker-compose.yml` is there.

## 4. Find the address you will open in the browser

On the server:

```bash
hostname -I
```

The first number is usually the server IP, for example `203.0.113.10`. You will open:

```text
http://203.0.113.10:3030
```

Use your number, not this example. If you are sitting at the server and will use its own browser, the address is `http://localhost:3030` instead.

## 5. Create the password file

Still inside `~/FreelanceTrack`:

```bash
cp .env.example .env
```

Make a long random secret:

```bash
openssl rand -base64 32
```

Copy the line it prints. Then open the file:

```bash
nano .env
```

Change these lines. Leave the others as they are unless you know you need a different timezone.

```text
ADMIN_USER=demo
ADMIN_PASS=choose-a-real-password
JWT_SECRET=paste-the-openssl-line-here
CLIENT_ORIGIN=http://YOUR_SERVER_IP:3030
APP_TIMEZONE=Asia/Hong_Kong
```

Rules:

- `JWT_SECRET` must be at least 16 characters. The `openssl` line is long enough.
- `CLIENT_ORIGIN` must be the exact address you will type in the browser, including `http://` and `:3030`, with no slash at the end. If this does not match, the sign-in button answers with an error.
- `APP_TIMEZONE` is your zone. `Asia/Hong_Kong` is correct for Hong Kong. Other examples: `Asia/Singapore`, `UTC`.

In nano, save with `Ctrl+O`, press Enter, then leave with `Ctrl+X`.

Check the file is there and that the secret is not still the example text:

```bash
grep -E 'ADMIN_USER|CLIENT_ORIGIN|JWT_SECRET' .env
```

`JWT_SECRET` must not still say `replace-with-a-long-random-string`.

## 6. Build and start the app

The first build downloads images and compiles the app. It can take several minutes. Leave the window open.

```bash
docker compose up -d --build
```

`-d` keeps it running after the command finishes.

Wait until this shows `mongodb`, `server`, and `client` as running or healthy:

```bash
docker compose ps
```

If `server` is still starting, wait 20 seconds and run `docker compose ps` again.

## 7. Load the sample companies and sessions

Run this once, after step 6 looks healthy. It **deletes** any sessions and companies already in the database, then inserts four sample companies and ten sessions.

```bash
docker compose --profile seed run --rm seed
```

The command finishes by itself. You want it to exit without an error.

## 8. Open the website

On your own computer, open the address from step 4, for example:

```text
http://203.0.113.10:3030
```

Sign in with `ADMIN_USER` and `ADMIN_PASS` from `.env`.

You should see a month calendar. Open **Companies** to see the sample clients. Open **Dashboard** for the month totals.

## 9. Commands you will use later

Run these from `~/FreelanceTrack`.

See what is running:

```bash
docker compose ps
```

Follow the API log on screen. Press `Ctrl+C` to stop following. The app keeps running.

```bash
docker compose logs -f server
```

Read one saved JSON log line:

```bash
ls -l server/logs
tail -n 1 server/logs/freelancetrack.log
```

Stop the app:

```bash
docker compose down
```

Start it again without rebuilding:

```bash
docker compose up -d
```

Rebuild after you change the code or `.env`:

```bash
docker compose up -d --build
```

Changing `.env` is not picked up until you run that again.

## 10. If something goes wrong

**`docker: permission denied`**

Log out and back in. Then run `docker version` again.

**`docker compose` is not found**

```bash
sudo apt install -y docker-compose-v2
```

**The browser cannot connect**

On the server:

```bash
docker compose ps
hostname -I
```

The client container must be running. In the browser, use `http://`, the IP from `hostname -I`, and port `3030`.

If the server has a firewall, allow that port:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3030/tcp
sudo ufw enable
sudo ufw status
```

Allow OpenSSH **before** you enable the firewall, or you can lock yourself out of SSH.

**The page loads, but sign-in fails or returns you to the login screen**

`CLIENT_ORIGIN` in `.env` must match the browser address exactly. Then recreate the containers:

```bash
grep CLIENT_ORIGIN .env
docker compose up -d --build
```

Also keep this line in `.env` while you are using plain `http://`:

```text
COOKIE_SECURE=false
```

**`seed` says connection refused**

The database was not ready. Check `docker compose ps`, wait until `mongodb` is healthy, then run the seed command from step 7 again.

**Port 3030 is already used**

```bash
sudo ss -ltnp | grep 3030
```

Stop the other program, or change the left side of `"3030:80"` in `docker-compose.yml` and set `CLIENT_ORIGIN` to that same port.

**See the real error**

```bash
docker compose logs --tail=50 server
docker compose logs --tail=50 client
docker compose logs --tail=50 mongodb
```

## What not to publish

The app you open is port **3030**. The same Compose file also listens on port **5050** (the API) and port **27017** (the database) on the server. Do not forward those two ports on a cloud firewall. Anyone who can reach port 27017 can read the database. Use port 3030 for the browser.
