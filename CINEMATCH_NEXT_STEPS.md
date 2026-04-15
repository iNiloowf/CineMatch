# CineMatch Next Steps

Use this file as the shared checklist for future improvements.

- Profile image uploads:
  Move profile photos to Supabase Storage and save only the image URL in the profile.

- Loading skeletons:
  Add polished loading placeholders for `Profile`, `Picks`, `Linked`, `Shared`, and login/session restore states.

- Database-backed achievements:
  Save unlocked achievements in Supabase so they survive logout, refresh, and device changes.

- Better invite and linking flow:
  Add invite states like `sent`, `opened`, `accepted`, plus copy success, revoke, and resend actions.

- Trailer viewer:
  Add a trailer button and in-app trailer modal/player inside the movie details flow.

- Smarter Discover recommendations:
  Improve title ordering with “because you liked…”, better genre balance, and less repetitive results.

- First-time onboarding:
  Add a setup flow for favorite genres, movie/series preference, and taste setup before Discover.

- Better shared planning:
  Add filters like `shared and unwatched`, planning tags, and lightweight notes for shared titles.

- Accessibility and mobile polish:
  Improve tap targets, focus states, contrast, keyboard behavior, and modal interactions.

- Hidden debug/admin screen:
  Add a private diagnostics page showing current user id, session state, DB counts, and last sync status.
