import React, { Component } from 'react';
import {
    View,
    StyleSheet,
    PanResponder,
    Dimensions,
    Image,
    ImageBackground,
    Animated,
    Text,
    TouchableOpacity,
    findNodeHandle,
    ActionSheetIOS,
    UIManager
} from "react-native";
import PropTypes from 'prop-types';
import PixelColor from "./GetHex";
import bodyMap from "./model/bodymap";
import * as _ from "lodash";
import { zh } from "./i18n/zh";
import { en } from "./i18n/en";

const deviceWidth = Dimensions.get("window").width;
class ColorPicker extends Component {
    static propTypes = {
        data: PropTypes.array,
        width: PropTypes.number,
        height: PropTypes.number,
        isEdit: PropTypes.bool, //当前是否允许编辑
        bg: PropTypes.string
    };
    static defaultProps = {
        data: [],
        width: deviceWidth,
        height: parseInt(1092 / 819 * deviceWidth),
        isEdit: false,
        bg: bodyMap
    };
    constructor(props) {
        super(props);
        this.animateResponders = {};
        this.state = {
            pixelColor: "transparent",
            imageData: null,
            points: [],
            offsetX: 0,
            offsetY: 0,
            showGuideAnimation: false,
            width: props.width,
            height: parseInt(1092 / 819 * props.width),
            guidePointVisibility: new Animated.Value(0),
            guidePointLeft: new Animated.Value(parseInt(props.width * 2 / 3)),
            guidePointScale: new Animated.Value(1)
        };
        this.panResponders = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: this._handlePanResponderGrant,
            onPanResponderMove: this._handlePanResponderMove,
            onPanResponderRelease: this._handlePanResponderEnd,
            onPanResponderTerminate: this._handlePanResponderEnd
        });
    }
    componentDidMount() {
        this.resetData(this.props.data);
        this.setState({
            showGuideAnimation: this.props.needGuideAnimation ? true : false
        });
        if (this.props.needGuideAnimation) {
            this.startGuideAnimated();
        }
    }
    componentWillReceiveProps(newProps) {
        if (newProps.isEdit) {
            this.animateResponders = this.panResponders.panHandlers
        } else {
            this.animateResponders = {}
        }
    }
    startGuideAnimated() {
        var that = this;
        this.state.guidePointScale.setValue(1);
        this.state.guidePointVisibility.setValue(0);
        this.state.guidePointLeft.setValue(parseInt(that.state.width * 2 / 3));

        //一次执行渐变显示红点，向左移动，缩小原点，放大原点
        Animated.sequence([
            Animated.timing(this.state.guidePointVisibility, {
                toValue: 1,
                duration: 600
            }),
            Animated.timing(this.state.guidePointLeft, {
                toValue: parseInt(this.state.width / 3),
                duration: 1500,
            }),
            Animated.timing(this.state.guidePointScale, {
                toValue: 0.5,
                duration: 200
            }), Animated.timing(this.state.guidePointScale, {
                toValue: 1,
                duration: 200
            })
        ]).start(() => [
            this.startGuideAnimated()
        ])
    }
    resetData(data) {
        let promiseList = [];
        let newData = [];
        var that = this;
        let width = this.state.width;
        let height = this.state.height;
        for (var i in data) {
            promiseList.push(new Promise(function (resolve, reject) {
                that.checkIfPointIsInsideOfScope(resolve, reject, that.getPixelByPercentage(data[i].X_COORDINATE, width) - 10, that.getPixelByPercentage(data[i].Y_COORDINATE, height) - 10, width, height, i);
            }));
        }
        Promise.all(promiseList).then(function (pointColorArray) {
            for (var j in pointColorArray) {
                if (pointColorArray[j].color !== "#000000") {
                    newData.push(data[pointColorArray[j].index]);
                }
            }
            that.setState({
                points: newData
            })
        }).catch((err) => {
            that.setState({
                points: data
            })
        });
    }
    _handlePanResponderGrant = (e, gestureState) => {
    }
    _handlePanResponderEnd = (e, gestureState) => {
        var that = this;
        let { width, height } = this.state;
        this.setState({
            showGuideAnimation: false
        })

        //let x = parseInt(e.nativeEvent.locationX);
        //let y = parseInt(e.nativeEvent.locationY);
        let x = parseInt(e.nativeEvent.pageX - this.state.offsetX);
        let y = parseInt(e.nativeEvent.pageY - this.state.offsetY);
        //console.log(e.nativeEvent.pageX + "," + e.nativeEvent.pageY);
        //console.log(e.nativeEvent.locationX + "," + e.nativeEvent.locationY);
        //先判断点击的坐标位是否在身体内部，如果是则直接返回原点，如果不是再判断红点周边是否有在身体内部的点。
        PixelColor.getHex(that.props.bg, { x, y, width, height })
            .then(pixelColor => {
                if (pixelColor === "#000000") {
                    //获取圆周45度等分点的坐标
                    let circlePoints = that.getPointsInCircle(x, y, 10);
                    //console.log(circlePoints);
                    //let colorArray = [];
                    let promiseList = [];
                    for (var i in circlePoints) {
                        promiseList.push(new Promise(function (resolve, reject) {
                            that.getPointColor(resolve, reject, circlePoints[i].X_COORDINATE, circlePoints[i].Y_COORDINATE, width, height);
                        }));
                    }
                    Promise.all(promiseList).then(function (colorArray) {
                        let sortedColors = _.reverse(_.sortBy(colorArray));
                        console.log(sortedColors);
                        if (sortedColors[0] === "#000000") {
                            that.setState({
                                pixelColor: "Invalid"
                            });
                        } else {
                            that.setState({ pixelColor });
                            let newPoints = JSON.parse(JSON.stringify(that.state.points));
                            newPoints.push({ X_COORDINATE: that.getPercentageByPixel(x, that.state.width), Y_COORDINATE: that.getPercentageByPixel(y, that.state.height) });
                            that.setState({
                                points: newPoints
                            });
                            this.onDataChange(newPoints);
                        }
                    });
                } else {
                    this.setState({ pixelColor });
                    let newPoints = JSON.parse(JSON.stringify(this.state.points));
                    newPoints.push({ X_COORDINATE: that.getPercentageByPixel(x, that.state.width), Y_COORDINATE: that.getPercentageByPixel(y, that.state.height) });
                    this.setState({
                        points: newPoints
                    });
                    this.onDataChange(newPoints);
                }
            }).catch(console.error);
    }
    checkIfPointIsInsideOfScope(resolve, reject, x, y, width, height, index) {
        var that = this;
        PixelColor.getHex(this.props.bg, { x, y, width, height })
            .then(pixelColor => {
                if (pixelColor === "#000000") {
                    let circlePoints = that.getPointsInCircle(x, y, 10);
                    //console.log(circlePoints);
                    //let colorArray = [];
                    let promiseList = [];
                    for (var i in circlePoints) {
                        promiseList.push(new Promise(function (resolve, reject) {
                            that.getPointColor(resolve, reject, circlePoints[i].X_COORDINATE, circlePoints[i].Y_COORDINATE, width, height);
                        }));
                    }
                    Promise.all(promiseList).then(function (colorArray) {
                        let sortedColors = _.reverse(_.sortBy(colorArray));
                        console.log(sortedColors);
                        if (sortedColors[0] === "#000000") {
                            resolve({
                                color: pixelColor,
                                index
                            });
                        } else {
                            resolve({
                                color: sortedColors[0],
                                index
                            });
                        }
                    });
                } else {
                    resolve({
                        color: pixelColor,
                        index
                    });
                }
                //colorArray.push(pixelColor);
                //console.log(i);
            }).catch(e => {
                reject(e);
            });
    }
    /**
     *
     * @description 输出当前画布打点坐标数据
     * @param {*} data
     * @memberof ColorPicker
     */
    onDataChange(data) {
        this.props.onDataChange && this.props.onDataChange(data);
    }
    getPointColor(resolve, reject, x, y, width, height) {
        PixelColor.getHex(this.props.bg, { x, y, width, height })
            .then(pixelColor => {
                resolve(pixelColor);
                //colorArray.push(pixelColor);
                //console.log(i);
            }).catch(e => {
                reject(e);
            });
    }
    getPointsInCircle(x, y, radius) {
        let points = [];
        //将圆周均分8块，每45弧度取点坐标，理论上覆盖圆周
        for (var i = 0; i < 8; i++) {
            var pX = x + Math.sin(2 * Math.PI / 360 * 45 * i) * radius;
            var pY = y + Math.cos(2 * Math.PI / 360 * 45 * i) * radius;
            points.push({
                X_COORDINATE: pX,
                Y_COORDINATE: pY
            });
        }
        return points;
    }
    randomStringId(n) {
        let str = "abcdefghijklmnopqrstuvwxyz9876543210";
        let tmp = "",
            i = 0,
            l = str.length;
        for (i = 0; i < n; i++) {
            tmp += str.charAt(Math.floor(Math.random() * l));
        }
        return tmp;
    }
    getPercentageByPixel(pixel, widthOrHeight) {
        return pixel / widthOrHeight * 100;
    }
    getPixelByPercentage(percentage, widthOrHeight) {
        return percentage / 100 * widthOrHeight;
    }
    renderPoints() {
        let pointsContainer = [];

        for (var i in this.state.points) {
            pointsContainer.push(<View key={this.randomStringId(10)} style={[styles.point, { top: this.getPixelByPercentage(this.state.points[i].Y_COORDINATE, this.state.height) - 10, left: this.getPixelByPercentage(this.state.points[i].X_COORDINATE, this.state.width) - 10 }]} />);
        }
        return (<View style={{ position: "absolute", left: 0, top: 0, backgroundColor: "transparent", width: this.state.width, height: this.state.height }}>{pointsContainer}</View>);

    }
    getTranslatedText(type, key, language) {
        return language.indexOf("zh") > -1 ? zh[type][key] : en[type][key];
    }
    clearAllPoints() {
        var that = this;
        ActionSheetIOS.showActionSheetWithOptions({
            options: [
                that.getTranslatedText("MESSAGE", "DELETE_CONFIRM_IOS", that.props.locale),
                that.getTranslatedText("BUTTON", "DIALOG_CANCEL", that.props.locale),
            ],
            cancelButtonIndex: 1,
            destructiveButtonIndex: 0
        }, function (index) {
            if (index === 0) {
                that.setState({
                    points: []
                })
                that.onDataChange([]);
            }
        })
    }
    showHelpZone() {
        return null;
        return (<View>
            <View style={[styles.handle, { backgroundColor: this.state.pixelColor }]} />
            <View><Text>{this.state.pixelColor}</Text></View>
        </View>)
    }
    renderDeleteBtn() {
        if (this.props.isEdit) {
            if (this.state.points.length > 0)
                return (<TouchableOpacity style={styles.deleteBtn} onPress={() => this.clearAllPoints()}>
                    <Image source={require("./img/injury_delete_btn.png")} style={{ width: 44, height: 44 }} />
                </TouchableOpacity>)
            else {
                return (<View style={styles.deleteBtn}>
                    <Image source={require("./img/injury_delete_btn.png")} style={{ width: 44, height: 44 }} />
                    <View style={styles.deleteBtnDisabled} />
                </View>)
            }
        } else return null
    }
    renderGuideAnimation() {
        let { width, height } = this.state;
        if (this.props.isEdit && this.state.showGuideAnimation) {
            return (<View style={{ width, height, position: "absolute", top: 0, left: 0 }}>
                <Image source={require("./img/bodymap_guide_pic.png")} style={{ width, height, resizeMode: "contain" }} />
                <Animated.View style={[styles.point, { top: parseInt(height / 2), transform: [{ scale: this.state.guidePointScale }], left: this.state.guidePointLeft, opacity: this.state.guidePointVisibility }]}></Animated.View>
            </View >)
        } else {
            return null
        }
    }
    onLayout({ nativeEvent }) {
        let { x, y, width, height } = nativeEvent.layout;
        console.log(x + "," + y);
        console.log(width + "," + height);
        const handle = findNodeHandle(this.currentComponent);

        return new Promise((resolve) => {
            UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
                console.log("x,y:" + x + ":" + y);
                console.log("pX,pY:" + pageX + ":" + pageY);
                console.log("w,h:" + width + "," + height)
                console.log("screen width:" + deviceWidth);
                //修复屏幕横向滚动造成的坐标计算错误问题
                this.setState({
                    offsetX: pageX > deviceWidth ? pageX - deviceWidth : pageX,
                    offsetY: pageY + 14
                });
                resolve({
                    x,
                    y,
                    width,
                    height,
                    pageX,
                    pageY
                });
            });
        });
    }
    render() {
        let { width, height } = this.state;
        return (<View style={[styles.container, { height: height + 14 }]} onLayout={this.onLayout.bind(this)} ref={(ref) => this.currentComponent = ref}>
            <Animated.View
                style={{ backgroundColor: this.state.pixelColor, width, height, position: "absolute", top: 14, left: 0 }}
                {...this.animateResponders}
            >
                <ImageBackground
                    style={{ width, height, backgroundColor: "white", resizeMode: "contain" }}
                    source={{ uri: this.props.bg }}>
                    {this.renderPoints()}
                </ImageBackground>
                {this.renderGuideAnimation()}
            </Animated.View>
            {this.renderDeleteBtn()}
            {this.showHelpZone()}
        </View >)
    }
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white"
    },
    deleteBtnDisabled: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 44,
        height: 44,
        backgroundColor: "rgba(255, 255, 255, 0.6)"
    },
    deleteBtn: {
        position: "absolute",
        top: 0,
        right: 0
    },
    point: {
        position: "absolute",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "white",
        height: 20,
        width: 20,
        backgroundColor: "red"
    },
    handle: {
        borderRadius: 40,
        borderWidth: 4,
        borderColor: "black",
        height: 40,
        width: 40
    }
});
export default ColorPicker;
