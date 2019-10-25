let serial;
let brightnessVariation01 = 0;
let brightnessVariation02 = 0;
let brightnessVariation03 = 0;
let fanSpeed = 0;
let character01, character02, character03;
let twoCandlesLit = false;
let CANDLE_THRESHOLD = 200;
let CANDLE_TIMER_MAX = 10;

//serial com var
let portName = '/dev/tty.usbmodem14301'; // fill in your serial port name here

function setup() {
  createCanvas(windowWidth, windowHeight);
  bg = loadImage('graveyard.jpg');

  //serial communication
  serial = new p5.SerialPort();    // make a new instance of the serialport library
  serial.on('data', serialEvent);  // callback for when new data arrives
  serial.on('error', serialError); // callback for errors
  serial.on('open', gotOpen);
  serial.list();                   // list the serial ports
  serial.open(portName);           // open a serial port

}

//serial communication functions
function serialEvent() {
  let currentString = serial.readStringUntil("\r\n");
	if (currentString == '') {
		return;
	}
  let values = currentString.split(" ");
	brightnessVariation01 = Number(values[0]);
	brightnessVariation02 = Number(values[1]);
	brightnessVariation03 = Number(values[2]);
  //console.log(currentString);

  // The more candles are lit, the more the fan blows
  let brightnessSum =
  brightnessVariation01 + brightnessVariation02 + brightnessVariation03;
  fanSpeed = constrain(map(brightnessSum, 0, 1023 * 3, 0, 255), 0, 255);
  //console.log(currentString);

  serial.write(fanSpeed);

}

function serialError(err) {
  print('Something went wrong with the serial port. ' + err);
}

// Connected to our serial device
function gotOpen() {
  print("Serial Port is open !");
  serial.write(0); // fan input = 0
}

function onBufferLoad() {
  charImage01 = loadImage('ghost03.png');
  charImage02 = loadImage('ghost02Transparency.png');
  charImage03 = loadImage('swingingGhost.png');
  scareImage01 = loadImage('jumpscare01.png');
  character01 = new Character(
    0.5 * width,
    height / 2,
    16,
    charImage01,
    scareImage01,
    samples.get("pad1"),
    samples.get("vox1"),
  );
  character02 = new Character(
    0.75 * width,
    height / 3,
    12,
    charImage02,
    scareImage01,
    samples.get("pad2"),
    samples.get("vox2"),
  );
  character03 = new Character(
    width * 0.2,
    height * 0.2,
    16,
    charImage03,
    scareImage01,
    samples.get("pad3"),
    samples.get("vox3"),
  );
  samples.get("padF").loop = true;
  samples.get("padF").fadeIn = 10;
  samples.get("padF").connect(masterBus).start();
  Tone.context.resume();
  Tone.Transport.start();
}

let samples = new Tone.Players({
  	//"padC" : "Pad Ambient C.mp3",
  	"padF" : "Pad Ambient F.mp3",
  	"vox1" : "Vox1.mp3",
  	"vox2" : "Vox2.mp3",
  	"vox3" : "Vox3.mp3",
  	"pad1" : "Pad Steps 1.mp3",
  	"pad2" : "Pad Steps 2.mp3",
  	"pad3" : "Bell.mp3"
}, onBufferLoad);

let masterBus = new Tone.Limiter(-6).toMaster();

function mapPow(value, inMin, inMax, outMin, outMax, pow=1) {
  inMin = Math.pow(inMin, pow);
  inMax = Math.pow(inMax, pow);
  return map(Math.pow(value, pow), inMin, inMax, outMin, outMax);
  // calculate adjustment factor
}

//graphics
function draw() {
  //scale(2);
  image(bg, 0, 0, width, height);

  if (character02) {
    character01.behavior(brightnessVariation01);
    character02.behavior(brightnessVariation02);
    character03.behavior(brightnessVariation03);
  }
}

class Character {
  // sound1 should be Tone.Player
  constructor(xPos, yPos, scale, characterPic, jumpScarePic, sound1, sound2) {
    this.candleTimer = CANDLE_TIMER_MAX;
    this.xStart = xPos;
    this.yStart = yPos;
    this.xPos = xPos;
    this.yPos = yPos;
    this.xOffset = 0;
    this.yOffset = 0;
    this.speed = 2;
    this.transparency = 0;
    this.candleIsOn = false;
    this.isJumpScare = false;
    this.figureScaleFactor = scale;
    this.figureScale = 1;
    this.scareScale = 1;
    this.timer = 0;
    this.characterPic = characterPic;
    this.jumpScarePic = jumpScarePic;

    // Sound setup
    this.sound1 = sound1;
    this.sound2 = sound2;
    this.panVol = new Tone.PanVol(0, -96).connect(masterBus);
    this.sound1.loop = true;
    this.sound1.fadeIn = 10;
    this.sound2.loop = true;
    this.sound2.fadeIn = 10;
    this.sound1.connect(this.panVol).start();
    this.sound2.connect(this.panVol).start();
  }

  shake(candleControl) {
    // The less bright the candle, the more shake
    this.speed = map(candleControl, 0, 1023, 2, 0);
    this.xOffset = random(-this.speed, this.speed);
    this.yOffset = random(-this.speed, this.speed);
    this.xPos += this.xOffset;
    this.yPos += this.yOffset;
  }

  blink(candleControl) {
     this.transparency = map(candleControl, 0, 1023, 0, 200);
  }

  adjustSound(candleControl) {

    if (this.isJumpScare) {
      if (Math.random() > 0.5) {
        this.sound1.playbackRate+= 0.1;
        this.sound2.playbackRate+= 0.1;
      }
      this.panVol.volume.value+= 2;
      if (this.panVol.volume.value >= -6) {
        this.panVol.volume.value = -6;
      }
    //  console.log(this.panVol.volume.value)
    } else {
      this.panVol.volume.value = mapPow(candleControl, 0, 1023, -96, -12, 0.5);
      this.sound1.playbackRate = mapPow(candleControl, 0, 1023, 0.8, 1.2);
      this.sound2.playbackRate = mapPow(candleControl, 0, 1023, 0.8, 1.2);
      this.panVol.pan.value = map(this.xPos * this.figureScale, 0, width, -1, 1);
    }
  }

  display(candleControl) {
    if (this.isJumpScare == false && this.candleIsOn == true) {
      this.shake(candleControl);
      this.blink(candleControl);
      push();
      //scale(this.figureScale);
      tint(255, this.transparency);
      image(this.characterPic, this.xPos, this.yPos, width/this.figureScaleFactor, this.characterPic.height * width/this.figureScaleFactor / this.characterPic.width);

      pop();
    }

    else if (this.isJumpScare == true && this.timer <= 20) {
      // jump scare animation
      push();
      tint(255, 200); // set transparency for jump scare
      let w =  width / this.figureScaleFactor * this.figureScale;
      image(this.characterPic, this.xPos, this.yPos, w, this.characterPic.height * w / this.characterPic.width);
      pop();

      this.figureScale += 0.2;

      if (this.figureScale >= 3) {
       tint(255);
       image(this.jumpScarePic, 0, 0, width, height);
       this.timer ++;
       print(this.timer);
      }
    } else {
       // reset values after jumpscare is dopne playing
       this.xPos = this.xStart;
       this.yPos = this.yStart;
       this.xOffset = 0;
       this.yOffset = 0;
       this.speed = 2;
       this.transparency = 0;
       this.isJumpScare = false;
       this.figureScale = 1;
       this.scareScale = 1;
       this.timer = 0;
    }
  }

  interact () {
    /*
    if(keyIsDown(ENTER) || this.candleIsOn == false) {
      print("yes");
      this.isJumpScare = true;
    }
    */
  }

  behavior (candleControl) {
    let candleIsOn = (candleControl > CANDLE_THRESHOLD);

    if (this.candleTimer && this.candleTimer > 0 ) {
      if (candleIsOn == this.candleIsOn) {
        // While the timer was counting down we reset
        this.candleTimer = CANDLE_TIMER_MAX;
      } else {
        this.candleTimer--;
      }
    }
    if (this.candleTimer == 0) {
      let litCandles = [character01.candleIsOn, character02.candleIsOn, character03.candleIsOn].filter(f => f == true);
      if (litCandles.length >= 2) {
        twoCandlesLit = true;
        //console.log("twoCandlesLit");
      }
      if (candleIsOn == false) {
        if (litCandles.length == 1 && twoCandlesLit) {
          this.isJumpScare = true
          twoCandlesLit = false;
         // console.log("start jumpscare");
          this.panVol.volume.value = -24;
        }
      }
      this.candleIsOn = candleIsOn;
      this.candleTimer = CANDLE_TIMER_MAX;
    }

    //console.log(this.xPos * this.figureScale, this.yPos * this.figureScale);


    this.adjustSound(candleControl);
    this.display(candleControl);
    this.interact();
  }
}
