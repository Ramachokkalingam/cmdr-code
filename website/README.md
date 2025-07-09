# CMDR Website

A modern, responsive website for CMDR - the AI-powered terminal that runs in your browser.

## Features

- **Modern Design**: Clean, professional interface with dark theme
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Elements**: Animated terminal demos, typing effects, and smooth scrolling
- **AI-Focused**: Highlights the AI-powered features of CMDR
- **Performance Optimized**: Fast loading with efficient animations

## Structure

```
website/
├── index.html          # Main landing page
├── css/
│   └── styles.css      # All styles and responsive design
├── js/
│   └── main.js         # Interactive functionality and animations
└── README.md           # This file
```

## Key Sections

1. **Hero Section**: Eye-catching introduction with animated terminal
2. **Features**: Comprehensive overview of CMDR's capabilities
3. **Demo**: Interactive terminal demonstration
4. **Getting Started**: Three easy ways to start using CMDR
5. **Download**: Call-to-action with multiple download options

## Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with CSS Grid, Flexbox, and animations
- **Vanilla JavaScript**: Interactive features without dependencies
- **Font Awesome**: Icon library for consistent iconography
- **Google Fonts**: JetBrains Mono and Inter for optimal readability

## Customization

### Colors
The website uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #06b6d4;
    --bg-color: #0f172a;
    /* ... more colors */
}
```

### Content
Update the content in `index.html` to match your specific CMDR implementation:

- Product descriptions
- Feature lists
- Download links
- GitHub repository links
- Contact information

## Development

To run locally:

1. Clone the repository
2. Open `index.html` in a modern web browser
3. For development with live reload, use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

## Deployment

The website is static and can be deployed to any web hosting service:

- **GitHub Pages**: Perfect for open-source projects
- **Netlify**: Easy deployment with continuous integration
- **Vercel**: Fast deployment with excellent performance
- **Traditional hosting**: Upload files to any web server

## Browser Support

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across different browsers and devices
5. Submit a pull request

## License

This website template is open source and available under the MIT License.
