var getWeighingResults = 0; //--> Variable to get weighing results in grams from ESP32.
var Circular_Progress_Bar_Val = 0;

// Processes the data received from the ESP32.
if (!!window.EventSource) {
    var source = new EventSource('/events');
    
    source.addEventListener('open', function(e) {
        console.log("Events Connected");
    }, false);
    
    source.addEventListener('error', function(e) {
        if (e.target.readyState != EventSource.OPEN) {
            console.log("Events Disconnected");
        }
    }, false);
    
    source.addEventListener('message', function(e) {
        console.log("message", e.data);
    }, false);

    source.addEventListener('allDataJSON', function(e) {
        console.log("allDataJSON", e.data);
        
        var obj = JSON.parse(e.data);
        
        getWeighingResults = obj.weight_In_g;
        
        if (getWeighingResults >= 0) Circular_Progress_Bar_Val = getWeighingResults;
        
        Convert();
    }, false);
}

// Call the Convert() function.
Convert();

// Function to convert weighing results from gram units to oz and kg units.
function Convert() {
    var x = document.getElementById("units");
    var i = x.selectedIndex;
    
    if (x.options[i].text == "kg") {
        var kg_unit = getWeighingResults / 1000;
        kg_unit = kg_unit.toFixed(3);
        document.getElementById("conv").innerHTML = kg_unit + " kg";
    }
}

// Displays the weighing value and displays a circular progress bar.
var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');
var start=4.70;
var cw=context.canvas.width/2;
var ch=context.canvas.height/2;
var diff;

var cnt = 0;
var bar=setInterval(progressBar,10);
function progressBar(){
    var Circular_Progress_Bar_Val_Rslt = map(Circular_Progress_Bar_Val,0,5000,0,100);
    Circular_Progress_Bar_Val_Rslt = Math.round(Circular_Progress_Bar_Val_Rslt);
    diff=(cnt/100)*Math.PI*2;
    context.clearRect(0,0,400,200);
    context.beginPath();
    context.arc(cw,ch,80,0,2*Math.PI,false);
    context.fillStyle='#FFF';
    context.fill();
    context.strokeStyle='#f0f0f0';
    context.lineWidth=11;
    context.stroke();
    context.fillStyle='#000';
    context.strokeStyle='#0583F2';
    context.textAlign='center';
    context.lineWidth=13;
    context.font = '20pt Verdana';
    context.beginPath();
    context.arc(cw,ch,80,start,diff+start,false);
    context.stroke();
    context.fillStyle='#8C7965';
    context.fillText(getWeighingResults + ' g',cw,ch+10);
    
    if(cnt<Circular_Progress_Bar_Val_Rslt) {
        cnt++;
    }
            
    if(cnt>Circular_Progress_Bar_Val_Rslt) {
        cnt--;
    }
}

// Scale from weighed value to Progress bar value.
function map( x,  in_min,  in_max,  out_min,  out_max){
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// XMLHttpRequest to submit data.
function send_BTN_Cmd() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "BTN_Comd?BTN_Tare=T", true);
    xhr.send();
}

// BLE-related functionality
const connectButton = document.getElementById('connectBleButton');
const disconnectButton = document.getElementById('disconnectBleButton');

var deviceName ='ESP32';
var bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
var ledCharacteristic = '19b10002-e8f2-537e-4f6c-d104768a1214';
var sensorCharacteristic= '19b10001-e8f2-537e-4f6c-d104768a1214';

var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;

connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

disconnectButton.addEventListener('click', disconnectDevice);

function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Connected to device ' + device.name;
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattservicedisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer =>{
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(bleService);
    })
    .then(service => {
        bleServiceFound = service;
        console.log("Service discovered:", service.uuid);
        return service.getCharacteristic(sensorCharacteristic);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        sensorCharacteristicFound = characteristic;
        return sensorCharacteristicFound.startNotifications().then(_ => {
            console.log('Notifications started.');
            sensorCharacteristicFound.addEventListener('characteristicvaluechanged', handleSensorValueChanged);
        });
    })
    .catch(error => {
        console.error('Connection failed!', error);
        bleStateContainer.innerHTML = "Failed to connect.";
        bleStateContainer.style.color = "#d13a30";
    });
}

function handleSensorValueChanged(event){
    const value = event.target.value;
    console.log('Received value from sensor:', value);
}

function disconnectDevice(){
    if (!bleServer) {
        console.log("Not connected to any device.");
        return;
    }
    console.log("Disconnecting...");
    bleServer.disconnect();
}

function onDisconnected(event) {
    console.log('Device disconnected.');
    bleStateContainer.innerHTML = 'Disconnected';
    bleStateContainer.style.color = "#d13a30";
}
function calculatePrice() {
    var x = document.getElementById("goods");
    var i = x.selectedIndex;
    var weightInKg = getWeighingResults / 1000;  // Convert grams to kilograms
    var pricePerKg;
  
    if (x.options[i].value === "pork") {
      pricePerKg = 50;  // 50k per 1000g for pork
    } else if (x.options[i].value === "vegetables") {
      pricePerKg = 20;  // 20k per 1000g for vegetables
    } else if (x.options[i].value === "fruit") {
      pricePerKg = 30;  // 30k per 1000g for fruit
    }
  
    var totalPrice = weightInKg * pricePerKg;
    totalPrice = totalPrice.toFixed(2); // Round to two decimal places
    document.getElementById("price").innerHTML = "Giá: " + totalPrice + "k";
  }
  function Convert() {
    var x = document.getElementById("units");
    var i = x.selectedIndex;
  
    if (x.options[i].text == "kg") {
      var kg_unit = getWeighingResults / 1000;
      kg_unit = kg_unit.toFixed(3);
      document.getElementById("conv").innerHTML = kg_unit + " kg";
    }
  
    calculatePrice();  // Call the price calculation function
  }
    