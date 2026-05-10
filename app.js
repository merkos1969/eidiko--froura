// app.js - Υπολογισμός νυχτερινών και πενθήμερων

function calculateShifts(schedule) {
    let nightCount = 0;
    let fiveDayCount = 0;

    schedule.forEach(day => {
        // day.shift = 'ΝΥ' για νύχτα, 'ΠΡ' για ημερήσια
        // day.dayOfWeek = 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'

        if (day.shift === 'ΝΥ') {
            nightCount++; // κάθε νύχτα μετράει
        }

        // Οι νύχτες Παρασκευή, Σάββατο, Κυριακή προσμετρούν και στο 5μερο
        if (day.shift === 'ΝΥ' && ['Πα', 'Σα', 'Κυ'].includes(day.dayOfWeek)) {
            fiveDayCount++;
        }

        // Κανονικές ημέρες μετράνε στο 5μερο
        if (day.shift === 'ΠΡ') {
            fiveDayCount++;
        }
    });

    return { nightCount, fiveDayCount };
}
