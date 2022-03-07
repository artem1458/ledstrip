const gatttool = require("gatttool/src");
const { Writable } = require("stream");

const handleData = data => console.log(`[onData] ←${data}`);

function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const FIVE_MINUTES = 300000;
const TEN_SECONDS = 10000;

const turnOffLight = () => {
    gatttool.write("char-write-cmd 0x00000003 7b040400ffffffffbf");
    return sleep(TEN_SECONDS);
}

const turnOnLight = async() => {
    //Turning on
    console.log('turning on')
    gatttool.write("char-write-cmd 0x00000003 7b040401ffffffffbf");
    await sleep(TEN_SECONDS);

    //Changing colour
    console.log('changing colours')
    const color = 'ff9d2e'
    gatttool.write(`char-write-cmd 0x00000003 7b0407${color}ffffbf`);
    await sleep(TEN_SECONDS);

    //Changing brightness
    console.log('changing brightness')
    const brightness = 'a0'
    gatttool.write(`char-write-cmd 0x00000003 7bff0113${brightness}00ffffbf`);
    await sleep(TEN_SECONDS);
}

const disconnect = () => {
    gatttool.write('disconnect C0:00:00:00:01:7E')
}

const runCycle = async() => {
    const ble = new Writable({
        objectMode: true,
        write: (data, encoding, done) => {
            console.log(`[stream] ←${data.toString(encoding)}`);
            done();
        }
    });
    try {
        gatttool.start({ onData: handleData, stream: ble });
    } catch (err) {
    }

    try {
        const ledStripMacAddress = 'C0:00:00:00:01:7E';
        gatttool.write(`connect ${ledStripMacAddress}`);
        await sleep(TEN_SECONDS);

        const now = new Date();
        if (now.getHours() < 18 || now.getHours() >= 22) {
            await turnOffLight();
        } else {
            await turnOnLight();
        }
        disconnect();
    } catch (error) {
        ble.destroy();
        disconnect();
        throw error;
    }
}

let previousCallDate = new Date();

const main = async() => {
    const now = new Date()
    const timeDiff = now.getTime() - previousCallDate.getTime();

    // if (timeDiff < FIVE_MINUTES) {
    //     return;
    // }

    try {
        await runCycle();
    } catch (error) {
        console.log(error);
    }
}

(async() => {
    while (true) {
        await main();
        await sleep(5000);
    }
})();

const handleExit = () => {
    disconnect();
    process.exit();
}

process.on('exit', handleExit);
process.on('SIGINT', handleExit);
process.on('SIGUSR1', handleExit);
process.on('SIGUSR2', handleExit);

// char-write-cmd 0x00000003 7b040401ffffffffbf  Включить
// char-write-cmd 0x00000003 7b040400ffffffffbf  Выключить
// char-write-cmd 0x00000003 7b0407${hex colour}ffffbf Поменять цвет
// char-write-cmd 0x00000003 7bff0113${ff-00}00 Поменять яркость
