// ΕΝΙΑΙΟ DATA.JS ΓΙΑ 2026
// Περιλαμβάνει βασικό μισθό, επίδομα, κλιμάκια και έλεγχο ηλικίας/διορισμού

window.PAY_TABLE = [
    {
        minService: 0,
        maxService: 2,
        minAge: 18,
        maxAge: 25,
        base: 1500,
        duty: 250
    },
    {
        minService: 2.01,
        maxService: 5,
        minAge: 18,
        maxAge: 30,
        base: 1550,
        duty: 260
    },
    {
        minService: 5.01,
        maxService: 10,
        minAge: 25,
        maxAge: 35,
        base: 1650,
        duty: 280
    },
    {
        minService: 10.01,
        maxService: 15,
        minAge: 30,
        maxAge: 40,
        base: 1704,
        duty: 310
    },
    {
        minService: 15.01,
        maxService: 20,
        minAge: 35,
        maxAge: 50,
        base: 1750,
        duty: 320
    },
    {
        minService: 20.01,
        maxService: 30,
        minAge: 40,
        maxAge: 60,
        base: 1800,
        duty: 330
    }
];

// Λειτουργία για εύρεση μισθού/επιδόματος ανάλογα με έτη υπηρεσίας & ηλικία
window.getPay = function(serviceYears, age) {
    for (let i = 0; i < window.PAY_TABLE.length; i++) {
        let rec = window.PAY_TABLE[i];
        if (serviceYears >= rec.minService && serviceYears <= rec.maxService &&
            age >= rec.minAge && age <= rec.maxAge) {
            return { base: rec.base, duty: rec.duty };
        }
    }
    return { base: 0, duty: 0 };
};