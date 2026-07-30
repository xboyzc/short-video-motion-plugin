# Security and privacy

Motion Playground is a local-first editor:

- Imported videos, images and SRT files stay in the browser as local object URLs.
- The local server listens on `127.0.0.1` and writes only inside `motion-playground/exports`.
- The repository excludes user media, subtitles, generated overlays, exports, runtime logs and dependency folders.
- Transparent MOV export invokes the locally installed FFmpeg executable without a shell.

Do not commit API keys, access tokens, private videos, subtitles or exported client material.

For a security issue, open a private GitHub security advisory for this repository instead of posting sensitive details in a public issue.
