<div align="center">

# 🌀 Send a Spiral

**Send someone a photo made of a thousand I love yous.**
Choose a photo, add their name and a note, then share a little surprise. One tap reveals their portrait in a red spiral of love on black, with music.

### [→ Make one now (free, no sign-up)](https://send-a-spiral.vercel.app)

<img src="demo.gif" width="300" alt="A portrait appearing in a spiral of red I love you lettering on a black background">

## ⭐ If you sent one, please [star this repo](https://github.com/Devansh-Singhal/send-a-spiral)

### It's how I know people are using it, and it helps others find it.

</div>

---

## How to send one

1. Open **[the site](https://send-a-spiral.vercel.app)**.
2. Choose a photo and type their name. Add your name and a short note if you'd like.
3. Tap **Create their spiral**, then **Copy link**, **WhatsApp**, or your phone's share button.

Optional: after choosing a photo, **Crop photo** opens an inline editor. Drag any edge or corner to crop freely, then drag inside to move the selection. Arrow keys move it; Shift + arrows resize it. **Use this crop** applies it; **Cancel** keeps the previous photo. **Reset crop** selects the full photo.

Their link opens on their name. When they tap, the music starts and your photo comes into view, letter by letter. You can also save a heart-shaped QR code for a card or gift, or switch to a plain QR.

The names and note live inside the link, with no database or account needed. The photo is saved when you create the link. **Anyone with the link can view the photo.**

## How it works

- **The portrait:** repeated red “I love you” lettering follows one continuous spiral on black. Each letter takes its brightness from your photo, gradually revealing the portrait in shades of red.
- **The music:** the soundtrack starts after the recipient taps to open. They can replay the reveal or turn sound off. Playback pauses when the page is hidden, and reduced-motion users see the finished spiral after opening.
- **The photo:** your browser prepares a smaller JPEG before uploading it. An applied crop is encoded into that JPEG; cropping close to the subject with less background makes the spiral clearer. Production uploads use a private Vercel Blob store and are served through the app using the photo reference in the gift link.
- **Link previews:** each recipient link includes their name in its title. The photo itself is not used as the link-preview image.
- It's plain HTML, CSS and JavaScript, with no framework or build step. It works on phones.

## Make your own copy

Run locally:

```sh
npm install
npm run dev
```

Open [the local preview](http://127.0.0.1:4174). Local uploads work without a Blob token. Links created locally use your local address; deploy the app before sending links to someone on another device.

To host your own copy, fork [this repo](https://github.com/Devansh-Singhal/send-a-spiral) and import your fork into [Vercel](https://vercel.com/new), or click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Devansh-Singhal/send-a-spiral)

Create a **private Vercel Blob store** and set `BLOB_READ_WRITE_TOKEN` in the Vercel project's environment before deploying. The token stays on the server. Names and notes do not require a database.

The code is free to use and change under the [MIT license](LICENSE). See [ASSETS.md](ASSETS.md) for media credits and third-party notices. Please keep the credit, and a ⭐ is always appreciated.

---

<div align="center">

Made by [Devansh Singhal](https://github.com/Devansh-Singhal) · If this made someone smile, **[⭐ star the repo](https://github.com/Devansh-Singhal/send-a-spiral)**

</div>
