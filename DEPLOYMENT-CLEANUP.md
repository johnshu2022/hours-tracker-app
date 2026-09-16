# Clean GitHub Pages deployment

Hourglass is a finished static website and does not use Jekyll or a repository-managed GitHub Actions deployment workflow.

Before uploading Build 34 to an existing repository, delete these paths if they exist:

```text
.github/workflows/
docs/_config.yml
docs/Gemfile
docs/Gemfile.lock
docs/_layouts/
docs/_includes/
docs/_posts/
docs/assets/css/style.scss
```

Uploading a ZIP through GitHub's website adds or replaces files but does not delete older files that are absent from the ZIP. Delete the paths above using GitHub's file interface, or remove them in a local clone and commit the deletions.

After cleanup, confirm that the repository contains `docs/index.html` and `docs/.nojekyll`. Configure **Settings → Pages** to use **Deploy from a branch**, the `main` branch, and the `/docs` folder. Commit any change inside `docs` to trigger a new deployment.
