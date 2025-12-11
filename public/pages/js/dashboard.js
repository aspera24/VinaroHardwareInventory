const ctx = document.getElementById('appointmentsChart').getContext('2d');

const appointmentsChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Appointments',
            data: [5, 7, 3, 6, 8, 4, 2],
            backgroundColor: '#3498db'
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
});



// Select all stat-cards
const cards = document.querySelectorAll('.stat-card');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

// Sample data
const data = {
    'total-customer': ['Juan Dela Cruz', 'Maria Santos', 'Pedro Reyes'],
    'total-appointments': ['Appointment 1', 'Appointment 2', 'Appointment 3'],
    'upcoming-today': ['Appointment Today 1', 'Appointment Today 2'],
    'pending-approval': ['Pending 1', 'Pending 2', 'Pending 3']
};

// Add click listener to each card
cards.forEach(card => {
    card.addEventListener('click', () => {
        const id = card.classList[1]; // get the second class (like 'total-customer')
        const items = data[id] || [];

        // Populate modal content
        modalBody.innerHTML = `<h3>${card.querySelector('h3').innerText}</h3>
                               <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        modal.style.display = 'flex'; // show modal
    });
});

// Close modal when clicking the X
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside modal-content
window.addEventListener('click', (e) => {
    if (e.target == modal) {
        modal.style.display = 'none';
    }
});
