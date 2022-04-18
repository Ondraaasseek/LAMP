//Přidání služeb
const { spawn, exec } = require("child_process");
const http = require("express");
const io = require("socket.io");
const gpio = require("onoff").Gpio;

//Definuju tlačítka
const switchOnOff = new gpio(26, 'in', 'rising', {debounceTimeout: 10});
const jasPBtn = new gpio(21, 'in', 'rising', {debounceTimeout: 10});
const jasMBtn = new gpio(20, 'in', 'rising', {debounceTimeout: 10});
//Definuji port
const port = 8080;
const app = http();
//Zapínám HTTP komunikaci na portu 8080 pomocí služby express.js
const server = app.listen(port, function(){
    console.log("Služba běží na adrese: http://192.168.25.1:" + port);
});
app.use(http.static("public"));

//Nastavení socketu
const socket = io(server);
socket.listen(8081);

//Deklarace proměnných
var lightValue = 0;
var r = 255;
var g = 255;
var b = 153;
var jas = 0.5;
var timeout;

/*
Funkce lampa() 
vytvoří child process který pomocí 
jazyka python a převzatých parametrů:
    lightvalue = Má - li svítit
    r = červené zbarvéní jednotlivých LEDek
    g = zelené -||-
    b = modré -||-
    jas = hodnota rozsvícení LEDek
odešle informace LED pásku.
*/
function lampa(){
    console.log("skripte");
    const python = spawn('python',['lampa.py', lightValue, jas, r, g, b]);
    python.stdout.on('data', function (data) {
      dataToSend = data.toString();
    });
    python.stderr.on('data', data => {
        console.error(`stderr: ${data}`);
    })
    python.on('exit', (code) => {
        console.log(`child process close all stdio with code ${code}`);
    })
    console.log(lightValue, jas, r, g, b);
}
/*
Funkce tlacitko() 
kontroluje hardwarové zmáčknutí tlačítek 
na pinech:
    21 = Zvýšení jasu
    20 = Snížení jasu
    26 = Zapnut / Vypnuto
proměnná timeout musí být protože tlačítka občas odeslali více požadavků naráz
proto timeout hlídá stisk a po jedné interakci vypne tlačítkům možnost znovu poslat stejnou žádost.
*/
async function tlacitko(){
    try {
        timeout = 1;
        switchOnOff.watch(function (err, val){
            if(err){
                console.log(err);
            }
            if(val == 1){
                if(lightValue == 1 && timeout == 1){
                    lightValue = 0;
                    //switchOnOff.unwatch();
                    lampa();
                    timeout = 0;
                }
                else if(lightValue == 0 && timeout == 1){
                    lightValue = 1;
                    //switchOnOff.unwatch();
                    lampa();
                    timeout = 0;
                }
            };
        });
        jasPBtn.watch(function (err, val){
            if(jas < 1 && lightValue == 1 && timeout == 1){
                jas = jas + 0.1;
                jas = parseFloat(jas.toFixed(1));
                lampa();
                timeout = 0;
            }
        });
        jasMBtn.watch(function(err, val){
            if(jas > 0.1 && lightValue == 1 && timeout == 1){
                jas = jas - 0.1;
                jas = parseFloat(jas.toFixed(1));
                lampa();
                timeout = 0;
            }
        });
    } catch (error) {
        console.log(error);
    }
}
//Volání funkce tlacitko() aby i bez socketové komunikace byla možnost ovládat lampu.
tlacitko();
//nastavení pevného intervalu na kontrolu stisku tlačítek. = 1(s)ekunda -- Byla by možnost využít 0.5s ale nevím jak by se to chovalo na pásek aby se nepřehltil.
setInterval(tlacitko, 1000);
socket.on('connection', function(socket){
    console.log("Navázáno socketové spojení");
//Socketové funkce které přicházejí z indexu.
    socket.on('jasP', function(){
        if(jas < 1 && lightValue == 1){
            jas = jas + 0.1;
            //hodnota jas se musí zaohrouhlovat aby se nedostalo mimo range podmínky
            jas = parseFloat(jas.toFixed(1));
            lampa();
        }
    });
    socket.on('jasM', function(){
        if(jas > 0.1 && lightValue == 1){
            jas = jas - 0.1;
            //hodnota jas se musí zaohrouhlovat aby se nedostalo mimo range podmínky
            jas = parseFloat(jas.toFixed(1));
            lampa();
        }
    });
    //při požadavku 'onOff' ze socketu se podle podmínky změní hodnota proměnné lightValue na zapnuto / vypnuto reprezentované hodnotami 1 / 0 a nakonec se zavolá funkce lampa()
    socket.on('onOff', function(){
        if(lightValue == 0){
            lightValue = 1;
            lampa();
        }
        else if (lightValue == 1){
            lightValue = 0;
            lampa();
        }
    });
    //při zavolání 'colorCode' ze socketu se poslaná data (red, green, blue) přiřadí danným lokálním proměnným a zavolá se funkce lampa()
    socket.on('colorCode', function(data){
        if(lightValue == 1){
            r = data.red;
            g = data.green;
            b = data.blue;
            lampa();
        }
      });
});

