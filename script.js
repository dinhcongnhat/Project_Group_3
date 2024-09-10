/*
    Web chỉnh lại phần box kết nối BLE sao cho nó to ra
    Nút nhấn chỉnh cho to hơn và chữ dễ nhìn hơn
    Có thể thêm background cho màu sao cho dễ nhìn
    Phần hàng hoá hiển thị thêm ảnh và giá tiền của 1 cân 
    Web bổ sung thêm 2 nút nhấn là Hold và unhold giá trị của cân
    Nút nhấn gửi dữ liệu xuống ESP32 thông qua BLE để thực hiện các chức năng
    VD: nút nhấn hiệu chuẩn thì nhấn trên web thì esp32 sẽ nhận được bản tin và sẽ hiệu chuẩn cân
        nút nhấn hold, unhold thì dùng để giữ giá trị và bỏ giữ giá trị
*/
// BLE-related functionality
// Cài đặt các biến và tham số
const connectButton = document.getElementById('connectBleButton');
const disconnectButton = document.getElementById('disconnectBleButton');
const received_weight_value = document.getElementById('weight_value_label')
const bleStateContainer = document.getElementById('bleState');

var deviceName ='ESP32';
var bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
var ledCharacteristic = '19b10002-e8f2-537e-4f6c-d104768a1214';
var LoadCell_Characteristic = '19b10001-e8f2-537e-4f6c-d104768a1214'; 

var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;

var getWeighingResults = 0; //Biến lưu giá trị cân theo gram
var Circular_Progress_Bar_Val = 0; // Biến lưu giá trị cho biểu đồ tròn

received_weight_value.innerHTML = getWeighingResults + " kg";
document.getElementById("price").innerHTML = "Giá: " + getWeighingResults + "k";

// Nút nhấn kết nối BLE
connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

// Nút nhất ngắt kết nối BLE
disconnectButton.addEventListener('click', disconnectDevice);

// Kiểm tra Bluetooth đã có chưa
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

// Kết nối BLE tới thiết bị
function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Kết nối tới thiết bị ' + device.name;
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
        return service.getCharacteristic(LoadCell_Characteristic);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        sensorCharacteristicFound = characteristic;
        characteristic.addEventListener('characteristicvaluechanged', Handle_Weight_Change);
        characteristic.startNotifications();
        console.log("Notifications Started.");
        return characteristic.readValue();
    })
    .then(value => {
        console.log("Read value: ", value);
        const decodedValue = new TextDecoder().decode(value);
        console.log("Decoded value: ", decodedValue);
        received_weight_value.innerHTML = decodedValue;
    })
    .catch(error => {
        console.error('Connection failed!', error);
    });
}

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";

    connectToDevice();
}

// Hiển thị giá trị cân nặng
function Handle_Weight_Change(event){
    getWeighingResults = new TextDecoder().decode(event.target.value);
    console.log("Characteristic value changed: ", getWeighingResults);
    if (getWeighingResults >= 0) Circular_Progress_Bar_Val = getWeighingResults;
    Show_Weight();
}

// Ngắt kết nối với Bluetooth
function disconnectDevice(){
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (sensorCharacteristicFound) {
            sensorCharacteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    bleStateContainer.innerHTML = "Web ngắt kết nối BLE";
                    bleStateContainer.style.color = "#d13a30";

                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
}
async function sendBLECommand(command) {
    if (bleCharacteristic) {
        const encoder = new TextEncoder();
        const data = encoder.encode(command);
        await bleCharacteristic.writeValue(data);
        console.log(`Sent command: ${command}`);
    } else {
        console.log('BLE device not connected');
    }
}

function sendCalibrationCmd() {
    console.log('Sending calibration command');
    sendBLECommand('CALIBRATE'); // Send calibration command to ESP32
}

function sendHoldCmd() {
    console.log('Sending hold command');
    sendBLECommand('HOLD'); // Send hold command to ESP32
}

function sendUnholdCmd() {
    console.log('Sending unhold command');
    sendBLECommand('UNHOLD'); // Send unhold command to ESP32
}
//tính tiền món hàng
function calculatePrice() {
    var x = document.getElementById("goods");
    var i = x.selectedIndex;
    var weightInKg = getWeighingResults / 1000;  // Convert grams to kilograms
    var pricePerKg;
    var imgSrc;

    // Determine price and image based on selected goods
    if (x.options[i].value === "none") {
        pricePerKg = 0;  // 50k per 1000g for pork
    }
    else if (x.options[i].value === "pork") {
        pricePerKg = 50000;  // 50k per 1000g for pork
        imgSrc = "image/pork.jpg"; // Update with the actual path of the pork image
    } else if (x.options[i].value === "vegetables") {
        pricePerKg = 20000;  // 20k per 1000g for vegetables
        imgSrc = "image/vegetables.jpg"; // Update with the actual path of the vegetables image
    } else if (x.options[i].value === "fruit") {
        pricePerKg = 30000;  // 30k per 1000g for fruit
        imgSrc = "image/fruit.jpg"; // Update with the actual path of the fruit image
    }

    var totalPrice = weightInKg * pricePerKg;
    totalPrice = totalPrice.toFixed(3); // Round to two decimal places
    document.getElementById("price").innerHTML = "Giá: " + totalPrice + " VND";

    // Update the image
    document.getElementById("goodsImage").src = imgSrc;
}

// Hiển thị giá trị cân trên biểu đồ tròn
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