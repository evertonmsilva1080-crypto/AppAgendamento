const moment = require( 'moment' );

module.exports = {
    SLOT_DURATION: 30,
    isOpened: async (horarios) => {},

    toCents: (price) => {
        return parseInt(price.toString().replace('.', '').replace(',', ''));
    },
    hourToMinutes: (hourMinute) => {
        const [hour, minutes] = hourMinute.split(':');
        return Number(hour) * 60 + Number(minutes);
    },
    sliceMinutes: (start, end, duration) => {
        const slices = [];
        let count = 0;

        start = moment(start);
        end = moment(end);

        while(end > start) {

            slices.push(start.format('HH:mm'));

            start = start.add(duration, 'minutes');
            count++;
        }

        return slices;
    },
    mergeDateTime: (date, time) => {
        const hora = typeof time === 'string' ? moment(time, 'HH:mm', true) : moment(time);
        const merged = `${moment(date).format('YYYY-MM-DD')}T${hora.format('HH:mm')}`;
        return merged;
    },
    splitByValues: (array, separator) => {
        const groups = [];
        let group = [];

        for (const item of array) {
            if (item === separator) {
                if (group.length > 0) groups.push(group);
                group = [];
            } else {
                group.push(item);
            }
        }

        if (group.length > 0) groups.push(group);
        return groups;
    }
};