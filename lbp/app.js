

(async () => {
    try {
        const params = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'XXXX':
                    if (params.length === 3) {
                            //TBC
                    } else {
                        console.log('Wrong parameters for Price Check HDL - e.g.: priceCheckHDL 1626825600 1626912000');
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }


        // Testing personal stats cache
        

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();

