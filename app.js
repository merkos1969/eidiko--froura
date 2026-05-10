// app.js - διορθωμένο για όλες τις νύχτες Παρασκευή-Κυριακή

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

        // Παρασκευή(5), Σάββατο(6), Κυριακή(0) νύχτες προσμετρούν και στα 5μερα
        if((day === 5 || day === 6 || day === 0) && (hasNight || hasWeekendDuty)){
            fives += 1;
        }
    });

    // Ενημέρωση DOM
    document.getElementById('sumNights').textContent = nights; // label μόνο Νύχτες
    document.getElementById('sumFives').textContent = fives;
}
