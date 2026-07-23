# Deploy & token reuse

## Publishing (GitHub Pages)
Push `main` to `github.com/NeweggGamerZone/Gamer-Zone-Website`; Pages serves it at
`https://neweggamerzone.github.io/Gamer-Zone-Website/`.

## Token — generate once, reuse every time
To avoid regenerating a token each session, drop a fine-grained PAT (Contents: Read/Write on
this repo) into a file named **`GithubToken.txt`** in the project root. It is **gitignored**, so
it never gets committed/published, and it persists in the folder between sessions. Cowork reads it
to push and never displays or stores the raw value elsewhere.

> Security note: tokens are secrets. Per Newegg data policy, the raw token is never printed in chat
> or committed to git. Keeping it in the gitignored `GithubToken.txt` gives you the "generate once"
> convenience without exposing it. If a token is ever pasted directly into chat, revoke it and
> replace it via this file.
