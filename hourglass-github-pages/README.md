# Hourglass — GitHub Pages edition

This folder contains the complete static Hourglass application. The three primary files are:

- `index.html` — Dashboard page and application entry point
- `styles.css` — Shared styling and responsive layout
- `script.js` — Dashboard behavior

The additional HTML and JavaScript files provide Time Entries, Payments, Settings, profiles, image metadata, PDF export, and full backup/restore. Keep all files together so those features continue to work.

## Publish with GitHub Pages

1. Create a new GitHub repository. Do not add a template README or `.gitignore` when creating it.
2. Extract this package.
3. Upload every extracted file to the repository root, including `.nojekyll`.
4. Commit the files to the `main` branch.
5. Open the repository's **Settings**, then **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and `/ (root)`, then select **Save**.
8. Wait for GitHub to display the published website address.

The site works from a repository subdirectory because its links and assets use relative paths.

## Important storage and privacy notes

- Hourglass data remains in each visitor's browser storage; publishing the source does not upload their time entries to GitHub.
- Data entered on one browser or device will not automatically appear on another.
- Clearing site data can erase locally stored records, so export full backups regularly.
- GitHub Pages makes the website source publicly accessible. Do not commit exported backups, personal photos, `.env` files, credentials, or other private data.
- Use the HTTPS address supplied by GitHub Pages.
- A browser-enforced Content Security Policy is included in every page. GitHub Pages controls the remaining HTTP security headers, so the Podman/Nginx edition provides more header-level control.

## Local test

Opening `index.html` directly may work, but using a local web server more closely matches GitHub Pages:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.
