// app.js - Νυχτερινές με πενθήμερα, αριθμός σε παρένθεση

function updateCountsFromCalendar(calendarDays) {
    let nights = 0;
    let fives = 0;

    calendarDays.forEach(dayObj => {
        const day = dayObj.dayOfWeek; // 0=Κυρ, 1=Δε, ..., 6=Σα
        const hasNight = dayObj.hasNight;
        const hasWeekendDuty = dayObj.hasWeekendDuty;

        // Όλες οι νύχτες μετράνε
        if(hasNight){
            nights += 1;
        }

        // Παρασκευή, Σάββατο, Κυριακή νύχτες προσμετρούν και στο 5μερο
        if((day === 5 || day === 6 || day === 0) && (hasNight || hasWeekendDuty)){
            fives += 1;
        }
    });

    // Ενημέρωση DOM με αριθμούς σε παρένθεση
    document.getElementById('sumNights').textContent = `Νύχτες (${nights})`;
    document.getElementById('sumFives').textContent = `Πενθήμερα (${fives})`;
}
