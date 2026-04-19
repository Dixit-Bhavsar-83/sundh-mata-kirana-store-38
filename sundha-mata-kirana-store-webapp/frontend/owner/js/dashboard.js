document.addEventListener('DOMContentLoaded', () => {
    animateNumbers();
    initSalesChart();
    checkMidnightReset();
});

function animateNumbers() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        let count = 0;
        const speed = target / 50; 
        const updateCount = () => {
            if (count < target) {
                count += Math.ceil(speed);
                counter.innerText = count > target ? target : count;
                setTimeout(updateCount, 20);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}

function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Gradients
    const orangeGrad = ctx.createLinearGradient(0, 0, 0, 250);
    orangeGrad.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
    orangeGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');

    const blueGrad = ctx.createLinearGradient(0, 0, 0, 250);
    blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    blueGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'],
            datasets: [
                {
                    label: 'Earnings (₹)',
                    // FIXED: Ab ye list (Array) hai
                    data:5555, 
                    borderColor: '#f97316',
                    backgroundColor: orangeGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#f97316'
                },
                {
                    label: 'Orders',
                    // FIXED: Isse bhi list bana diya
                    data:[500], 
                    borderColor: '#3b82f6',
                    backgroundColor: blueGrad,
                    borderWidth: 2,
                    // FIXED: Dash pattern format [line, gap]
                    borderDash:9, 
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0 
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    padding: 12,
                    borderRadius: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    displayColors: true
                }
            },
            scales: {
                y: {
                    display: false,
                    beginAtZero: true
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10, weight: '600' } }
                }
            }
        }
    });
}

function checkMidnightReset() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            location.reload(); 
        }
    }, 60000);
}