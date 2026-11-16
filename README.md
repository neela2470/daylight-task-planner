# Daylight

A calm, lightweight task planner that runs entirely in your browser. Add tasks, group them into projects, set due dates and priorities, and check off small wins. Your data stays in this browser on this device.

## Get started

No install or build step is needed. Open `index.html` in a modern browser, or serve the folder with any static file server. For example, with Python installed:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Features

- Add and edit tasks with notes, project, due date, and priority
- Create projects to group your work
- Filter by today, upcoming, completed, or project
- Search tasks and sort by due date, recently added, or priority
- Store changes in browser local storage, with no account or backend
- Responsive layout for desktop and mobile

## Project files

- `index.html` — app structure and dialogs
- `styles.css` — responsive styling
- `app.js` — task behavior and local storage

## Notes

The starter tasks are sample content for the first visit. Removing or editing them is safe. Clearing browser storage resets the app to its starter state. Google Fonts are loaded from Google Fonts when online; the app uses system fallbacks if they are unavailable.

## License

This project is available under the MIT License. See [LICENSE](LICENSE).

## Team Git Workflow

Develop each task on a feature branch created from `main`. Commit changes with clear messages, push the branch to GitHub, and ask a teammate to review it before merging.
