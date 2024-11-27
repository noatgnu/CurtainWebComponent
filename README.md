# Curtain Web Component

This web component can be used to display volcano plots from Curtain using either Curtain session ID or Curtain DOI.

## Installation

Usage of this web component requires the following steps:

1. Include the web component script from `dist/bundle.js` in your HTML file:

```html
<script src="dist/bundle.js"></script>
```

2. Use the web component in your HTML file:

```html
<volcano-plot curtainid="SESSION_ID"></volcano-plot>
```

Replace `SESSION_ID` with the Curtain session ID you want to display. You can also use enable `search` attribute to allow users to search for a session data within the plot using Gene Names or Primary IDs.

## License

This project is licensed under the MIT License.
