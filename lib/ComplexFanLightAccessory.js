const BaseAccessory = require("./BaseAccessory");

class ComplexFanLightAccessory extends BaseAccessory {
  static getCategory(Categories) {
    return Categories.FANLIGHT;
  }

  constructor(...props) {
    super(...props);
  }

  _registerPlatformAccessory() {
    const { Service } = this.hap;

    this.accessory.addService(Service.Fan, this.device.context.name);
    this.accessory.addService(
      Service.Lightbulb,
      this.device.context.name + " Light"
    );

    super._registerPlatformAccessory();
  }

  _registerCharacteristics(dps) {
    const { Service, Characteristic } = this.hap;
    const serviceFan = this.accessory.getService(Service.Fan);
    const serviceLightbulb = this.accessory.getService(Service.Lightbulb);
    this._checkServiceName(serviceFan, this.device.context.name);
    this._checkServiceName(
      serviceLightbulb,
      this.device.context.name + " Light"
    );

    this.dpActive = this._getCustomDP(this.device.context.dpActive) || "1";
    this.dpRotationSpeed =
      this._getCustomDP(this.device.context.dpRotationSpeed) ||
      this._getCustomDP(this.device.context.RotationSpeed) ||
      "3";
    this.dpRotationDirection =
      this._getCustomDP(this.device.context.dpRotationDirection) || -1;
    this.dpLight =
      this._getCustomDP(this.device.context.dpLight) ||
      this._getCustomDP(this.device.context.dpLightOn) ||
      "9";
    this.dpBrightness =
      this._getCustomDP(this.device.context.dpBrightness) || "10";
    this.useLight = this._coerceBoolean(this.device.context.useLight, true);
    this.useBrightness = this._coerceBoolean(
      this.device.context.useBrightness,
      true
    );
    this.maxBrightness = parseInt(this.device.context.scaleBrightness) || 255;
    this.minBrightness =
      this.device.context.minBrightness != null
        ? parseInt(this.device.context.minBrightness)
        : 27;
    this.maxSpeed = parseInt(this.device.context.maxSpeed) || 4;

    const characteristicActive = serviceFan
      .getCharacteristic(Characteristic.On)
      .updateValue(this._getActive(dps[this.dpActive]))
      .on("get", this.getActive.bind(this))
      .on("set", this.setActive.bind(this));

    const characteristicRotationSpeed = serviceFan
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: this.maxSpeed,
        minStep: 1,
      })
      .updateValue(this._getSpeed(dps[this.dpRotationSpeed]))
      .on("get", this.getSpeed.bind(this))
      .on("set", this.setSpeed.bind(this));

    let characteristicRotationDirection;
    if (this.dpRotationDirection > -1) {
      // add the fan direction switch
      characteristicRotationDirection = serviceFan
        .getCharacteristic(Characteristic.RotationDirection)
        .updateValue(this._getRotationDirection(dps[this.dpRotationDirection]))
        .on("get", this.getRotationDirection.bind(this))
        .on("set", this.setRotationDirection.bind(this));
    }

    let characterLightOn;
    let characteristicBrightness;
    if (this.useLight) {
      characterLightOn = serviceLightbulb
        .getCharacteristic(Characteristic.On)
        .updateValue(this._getLightOn(dps[this.dpLight]))
        .on("get", this.getLightOn.bind(this))
        .on("set", this.setLightOn.bind(this));

      if (this.useBrightness) {
        characteristicBrightness = serviceLightbulb
          .getCharacteristic(Characteristic.Brightness)
          .updateValue(
            this.convertBrightnessFromTuyaToHomeKit(dps[this.dpBrightness])
          )
          .on("get", this.getBrightness.bind(this))
          .on("set", this.setBrightness.bind(this));
      }
    }

    this.device.on("change", (changes, state) => {
      if (
        changes.hasOwnProperty(this.dpActive) &&
        characteristicActive.value !== changes[this.dpActive]
      )
        characteristicActive.updateValue(changes[this.dpActive]);

      if (
        changes.hasOwnProperty(this.dpRotationSpeed) &&
        characteristicRotationSpeed.value !== changes[this.dpRotationSpeed]
      )
        characteristicRotationSpeed.updateValue(changes[this.dpRotationSpeed]);

      if (
        changes.hasOwnProperty(this.dpRotationDirection) &&
        characteristicRotationDirection &&
        characteristicRotationDirection.value !==
          changes[this.dpRotationDirection]
      )
        characteristicRotationDirection.updateValue(
          this.convertRotationDirection(changes[this.dpRotationDirection])
        );

      if (
        changes.hasOwnProperty(this.dpLight) &&
        characterLightOn &&
        characterLightOn.value !== changes[this.dpLight]
      )
        characterLightOn.updateValue(changes[this.dpLight]);

      if (
        changes.hasOwnProperty(this.dpBrightness) &&
        characteristicBrightness &&
        characteristicBrightness.value !== changes[this.dpBrightness]
      )
        characteristicBrightness.updateValue(
          this.convertBrightnessFromTuyaToHomeKit(changes[this.dpBrightness])
        );

      this.log.info("ComplexFanLight changed: " + JSON.stringify(state));
    });
  }

  /*************************** FAN ***************************/
  // Fan State
  getActive(callback) {
    this.getState(this.dpActive, (err, dp) => {
      if (err) return callback(err);

      callback(null, this._getActive(dp));
    });
  }

  _getActive(dp) {
    const { Characteristic } = this.hap;

    return dp;
  }

  setActive(value, callback) {
    const { Characteristic } = this.hap;

    return this.setState(this.dpActive, value, callback);

    callback();
  }

  // Fan Speed
  getSpeed(callback) {
    this.getState(this.dpRotationSpeed, (err, dp) => {
      if (err) return callback(err);

      callback(null, this._getSpeed(dp));
    });
  }

  _getSpeed(dp) {
    const { Characteristic } = this.hap;
    //		this.log.info("_getSpeed = " + dp);
    return dp;
  }

  setSpeed(value, callback) {
    const { Characteristic } = this.hap;
    if (value == 0) {
      return this.setState(this.dpActive, false, callback);
    } else {
      return this.setState(this.dpRotationSpeed, value, callback);
    }

    callback();
  }

  // Rotation direction
  getRotationDirection(callback) {
    this.getState(this.dpRotationDirection, (err, dp) => {
      if (err) return callback(err);
      callback(null, this._getRotationDirection(dp));
    });
  }

  _getRotationDirection(dp) {
    const { Characteristic } = this.hap;
    let result = this.convertRotationDirection(dp);
    this.log.debug("_getRotationDirection", dp, "->", result);
    return result;
  }

  setRotationDirection(value, callback) {
    const { Characteristic } = this.hap;
    const stateValue = this.convertRotationDirection(value);
    this.log.debug("setRotationDirection", value, "->", stateValue);
    return this.setState(this.dpRotationDirection, stateValue, callback);

    callback();
  }

  convertRotationDirection(value) {
    if (value == "reverse") return 0;
    if (value == "forward") return 1;
    if (value == 0) return "reverse";
    if (value == 1) return "forward";
    this.log.warning("Unexpected rotation direction value", value);
    return value;
  }

  /*************************** LIGHT ***************************/
  // Lightbulb State
  getLightOn(callback) {
    this.getState(this.dpLight, (err, dp) => {
      if (err) return callback(err);

      callback(null, this._getLightOn(dp));
    });
  }

  _getLightOn(dp) {
    const { Characteristic } = this.hap;

    return dp;
  }

  setLightOn(value, callback) {
    const { Characteristic } = this.hap;

    return this.setState(this.dpLight, value, callback);

    callback();
  }

  // Lightbulb Brightness
  getBrightness(callback) {
    this.getState(this.dpBrightness, (err, dp) => {
      if (err) return callback(err);

      callback(null, this._getBrightness(dp));
    });
  }

  _getBrightness(dp) {
    const { Characteristic } = this.hap;
    //		this.log.info("_getBrightness = " + dp);
    return this.convertBrightnessFromTuyaToHomeKit(dp);
  }

  setBrightness(value, callback) {
    const { Characteristic } = this.hap;
    //        this.log.info("setBrightness - Raw value = " + value);
    return this.setState(
      this.dpBrightness,
      this.convertBrightnessFromHomeKitToTuya(value),
      callback
    );

    callback();
  }
}

module.exports = ComplexFanLightAccessory;
