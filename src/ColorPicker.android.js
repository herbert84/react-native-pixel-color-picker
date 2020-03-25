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
    Alert,
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
        this.setState({
            showGuideAnimation: this.props.needGuideAnimation ? true : false,
            points: this.props.data
        });
        if (this.props.needGuideAnimation) {
            this.startGuideAnimated();
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
        PixelColor.getHex(that.props.bg, x, y)
            .then(pixelColor => {
                if (pixelColor && pixelColor.length == 3 && pixelColor.join("") === "000") {
                    //获取圆周45度等分点的坐标
                    let circlePoints = that.getPointsInCircle(x, y, 10);
                    //console.log(circlePoints);
                    //let colorArray = [];
                    let promiseList = [];
                    for (var i in circlePoints) {
                        promiseList.push(new Promise(function (resolve, reject) {
                            that.getPointColor(resolve, reject, circlePoints[i].X_COORDINATE, circlePoints[i].Y_COORDINATE);
                        }));
                    }
                    Promise.all(promiseList).then(function (colorArray) {
                        let sortedColors = _.reverse(_.sortBy(colorArray));
                        console.log(sortedColors);
                        if (sortedColors[0] === "000") {
                            /*that.setState({
                                pixelColor: "Invalid"
                            });*/
                        } else {
                            //that.setState({ pixelColor });
                            let newPoints = JSON.parse(JSON.stringify(that.state.points));
                            newPoints.push({ X_COORDINATE: that.getPercentageByPixel(x, that.state.width), Y_COORDINATE: that.getPercentageByPixel(y, that.state.height) });
                            that.setState({
                                points: newPoints
                            });
                            that.onDataChange(newPoints);
                        }
                    });
                } else {
                    //this.setState({ pixelColor });
                    let newPoints = JSON.parse(JSON.stringify(this.state.points));
                    newPoints.push({ X_COORDINATE: that.getPercentageByPixel(x, that.state.width), Y_COORDINATE: that.getPercentageByPixel(y, that.state.height) });
                    this.setState({
                        points: newPoints
                    });
                    this.onDataChange(newPoints);
                }
            }).catch(console.error);
    }
    onDataChange(data) {
        this.props.onDataChange(data);
    }
    getPointColor(resolve, reject, x, y) {
        PixelColor.getHex(this.props.bg, x, y)
            .then(pixelColor => {
                resolve(pixelColor.join(""));
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
        Alert.alert(
            '',
            that.getTranslatedText("MESSAGE", "DELETE_CONFIRM_ANDROID", that.props.locale),
            [
                { text: that.getTranslatedText("BUTTON", "DIALOG_CANCEL", that.props.locale), onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
                {
                    text: that.getTranslatedText("BUTTON", "DIALOG_DELETE", that.props.locale), onPress: () => {
                        that.setState({
                            points: []
                        })
                        that.onDataChange([]);
                    }
                }
            ],
            { cancelable: false }
        )
    }
    showHelpZone() {
        return null;
        return (<View>
            <View style={[styles.handle, { backgroundColor: this.state.pixelColor }]} />
            <View><Text>{this.state.pixelColor}</Text></View>
        </View>)
    }
    renderDeleteBtn() {
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
    }
    renderGuideAnimation() {
        let { width, height } = this.state;
        if (this.state.showGuideAnimation) {
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
                console.log(x + ":" + y);
                console.log(pageX + ":" + pageY);
                this.setState({
                    //offsetX: pageX > deviceWidth ? pageX - deviceWidth : pageX,
                    offsetX: 16,
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
        if (this.props.isEdit) {
            return (<View style={[styles.container, { height: height + 14 }]} onLayout={this.onLayout.bind(this)} ref={(ref) => this.currentComponent = ref}>
                <Animated.View
                    style={{ width, height, position: "absolute", top: 14, left: 0 }}
                    {...this.panResponders.panHandlers}
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
        } else {
            return (<View ref={(ref) => this.currentComponent = ref}>
                <View
                    style={{ width, height }}
                >
                    <ImageBackground
                        style={{ width, height, backgroundColor: "white", resizeMode: "contain" }}
                        source={{ uri: this.props.bg }}>
                        {this.renderPoints()}
                    </ImageBackground>
                </View>
            </View >)
        }
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
