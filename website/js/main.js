// Navigation toggle for mobile
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Typed animation for hero terminal
const commands = [
    'ls -la',
    'cd projects',
    'git status',
    'npm start',
    'docker ps',
    'python app.py'
];

let currentCommand = 0;
let currentChar = 0;
let isDeleting = false;

function typeCommand() {
    const commandElement = document.getElementById('typed-command');
    if (!commandElement) return;

    const command = commands[currentCommand];
    
    if (isDeleting) {
        commandElement.textContent = command.substring(0, currentChar - 1);
        currentChar--;
    } else {
        commandElement.textContent = command.substring(0, currentChar + 1);
        currentChar++;
    }

    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && currentChar === command.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && currentChar === 0) {
        isDeleting = false;
        currentCommand = (currentCommand + 1) % commands.length;
        typeSpeed = 500; // Pause before next command
    }

    setTimeout(typeCommand, typeSpeed);
}

// Start typing animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(typeCommand, 1000);
});

// Copy to clipboard functionality
function copyToClipboard(button) {
    const codeBlock = button.parentElement;
    const code = codeBlock.querySelector('code');
    const text = code.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
        }
    });
}, observerOptions);

// Observe all animated elements
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step, .demo-feature');
    animatedElements.forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
});

// Demo terminal simulation
const demoLines = [
    { type: 'command', content: 'ls -la' },
    { type: 'output', content: 'total 64\ndrwxr-xr-x  8 user user 4096 Jul  4 10:30 .\ndrwxr-xr-x  3 user user 4096 Jul  4 10:25 ..\n-rw-r--r--  1 user user  220 Jul  4 10:25 .bashrc' },
    { type: 'ai', content: 'I see you\'re exploring the directory. Would you like me to explain the file permissions?' },
    { type: 'command', content: 'cd projects' },
    { type: 'command', content: 'git log --oneline' },
    { type: 'output', content: 'a1b2c3d Add AI-powered suggestions\ne4f5g6h Implement session persistence\ni7j8k9l Initial commit' },
    { type: 'ai', content: 'Your recent commits show great progress! The AI features are particularly interesting.' }
];

let demoIndex = 0;

function runDemoLine() {
    const demoContent = document.getElementById('demo-content');
    if (!demoContent || demoIndex >= demoLines.length) {
        demoIndex = 0; // Reset demo
        setTimeout(() => {
            if (demoContent) {
                demoContent.innerHTML = '';
                runDemoLine();
            }
        }, 3000);
        return;
    }

    const line = demoLines[demoIndex];
    const lineElement = document.createElement('div');

    switch (line.type) {
        case 'command':
            lineElement.className = 'terminal-line';
            lineElement.innerHTML = `
                <span class="prompt">demo@cmdr:~$</span>
                <span class="command">${line.content}</span>
            `;
            break;
        case 'output':
            lineElement.className = 'output';
            lineElement.textContent = line.content;
            break;
        case 'ai':
            lineElement.className = 'ai-suggestion active';
            lineElement.innerHTML = `
                <i class="fas fa-robot"></i>
                <span>AI: ${line.content}</span>
            `;
            break;
    }

    demoContent.appendChild(lineElement);
    demoIndex++;

    // Scroll to bottom of demo terminal
    demoContent.scrollTop = demoContent.scrollHeight;

    // Continue with next line
    setTimeout(runDemoLine, line.type === 'ai' ? 3000 : 1500);
}

// Start demo when the demo section comes into view
const demoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setTimeout(runDemoLine, 1000);
            demoObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const demoSection = document.querySelector('.demo');
    if (demoSection) {
        demoObserver.observe(demoSection);
    }
});

// Add some interactive hover effects
document.addEventListener('DOMContentLoaded', () => {
    // Add parallax effect to hero background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        }
    });

    // Add glow effect to terminal windows on hover
    const terminals = document.querySelectorAll('.terminal-window, .demo-terminal');
    terminals.forEach(terminal => {
        terminal.addEventListener('mouseenter', () => {
            terminal.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.2)';
        });
        
        terminal.addEventListener('mouseleave', () => {
            terminal.style.boxShadow = 'var(--shadow-lg)';
        });
    });

    // Add click effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                background-color: rgba(255, 255, 255, 0.3);
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Add loading animation for when page loads
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Add some CSS for loading state
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    
    body.loaded {
        opacity: 1;
    }
`;
document.head.appendChild(loadingStyle);
