<p align="center">
  <img src="https://github.com/user-attachments/assets/6dbe85a3-24cb-4f53-80a8-7f96cde5b55b" alt="PixelFace Logo" width="128"/>
</p>
<h1 align="center"/>PixelFace</h1>
PixelFace is a simple and an easy to use Minecraft vanilla entity faces API, written in Node.js. It supports all entities/mobs in the game. This works by taking the full entity textures from a source and cropping them on the right offset with the correct width and height. In this case, the textures used by this API are provided by https://mcasset.cloud.

This API can be integrated with any application, plugin or other software. I personally use this with the DiscordSRV plugin on my server, to provide mob faces to show when an entity dies and this gets reported to Discord.
# Usage
The API has a very simple syntax, as seen below:

```
https://pixelface.dedyn.io/faces/[nameofentity]
```

For example, to download the image of a zombie using cURL, use:

```
$ curl -o zombie.png https://pixelface.dedyn.io/faces/zombie
```
# Self Hosting
PixelFace can easily be hosted by yourself. You can either do this by manually installing Node.js, cloning the Git repository and then run the project. For the least hassle, I'd recommend using the Docker image I provide here.
## Docker
Using the Docker image, you can get the API quickly up and running.
### Docker Command
```
$ docker run -d -p 3000:3000 --name pixelface minionguyjpro/pixelface:latest
```
### Docker Compose
```yml
version: "3.8"
services:
  pixelface:
    image: minionguyjpro/pixelface:latest
    container_name: pixelface
    ports:
      - "3000:3000"
    restart: unless-stopped
```
# Contributing
Contributions to this project are more than welcome! Any new features or improvements to come would be great. To contribute to this project, first clone the repository and go into the working directory:

```
# Clone the repository locally
$ git clone https://github.com/Minionguyjpro/PixelFace
# Change into the working directory
$ cd PixelFace
```

Now make your changes to your fork of the repository. Finally, commit and push the changes:

```
# Track all changes and files
$ git add -A
# Commit the changes
$ git commit -asm "<Your commit message here>"
# Push the changes to your fork
$ git push origin
```