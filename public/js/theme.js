// Preia tema din localStorage sau folosește 'dark' implicit
const currentTheme = localStorage.getItem('theme') || 'dark';

// Setează pe body atributul de temă Imediat! (evită flash-ul alb/negru)
document.documentElement.setAttribute('data-theme', currentTheme);

document.addEventListener('DOMContentLoaded', () => {
    // Găsește butonul (butoanele) de toggle
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    
    // Setează iconița corectă la start
    const updateIcons = (theme) => {
        toggleBtns.forEach(btn => {
            btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        });
    };
    
    updateIcons(currentTheme);

    // Event listener pentru fiecare buton de toggle
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcons(newTheme);
        });
    });
});
