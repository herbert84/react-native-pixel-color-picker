import React, { Component } from 'react';
import {
    View,
    StyleSheet,
    PanResponder,
    Dimensions,
    ImageBackground,
    Animated,
    Text
} from "react-native";
import PixelColor from "./GetHex";
import * as _ from "lodash";

const deviceWidth = Dimensions.get("window").width;
class ColorPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pixelColor: "transparent",
            width: deviceWidth,
            height: 848 / 606 * deviceWidth,
            imageData: null,
            points: []
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
    _handlePanResponderGrant = (e, gestureState) => {
    }
    _handlePanResponderEnd = (e, gestureState) => {
        const { width, height } = this.state;
        let x = parseInt(e.nativeEvent.locationX);
        let y = parseInt(e.nativeEvent.locationY);
        console.log(e.nativeEvent.locationX);
        console.log(e.nativeEvent.locationY);
        console.log(width + ":" + height);
        /*PixelColor.getHex(bodyMap, { x, y, width, height })
            .then(pixelColor => {
                if (pixelColor === "#000000") {
                    this.setState({
                        pixelColor: "Invalid"
                    });
                } else {
                    this.setState({ pixelColor });
                    let newPoints = JSON.parse(JSON.stringify(this.state.points));
                    newPoints.push({ x, y });
                    this.setState({
                        points: newPoints
                    });
                }
            }).catch(console.error);
*/
        let circlePoints = this.getPointsInCircle(x, y, 20);
        console.log(circlePoints);
        let that = this;
        //let colorArray = [];
        let promiseList = [];
        for (var i in circlePoints) {
            promiseList.push(new Promise(function (resolve, reject) {
                that.getPointColor(resolve, reject, circlePoints[i].x, circlePoints[i].y, width, height);
            }));
        }
        Promise.all(promiseList).then(function (colorArray) {
            let sortedColors = _.reverse(_.sortBy(colorArray));
            if (sortedColors[0] === "#000000") {
                that.setState({
                    pixelColor: "Invalid"
                });
            } else {
                PixelColor.getHex(that.props.bg, { x, y, width, height })
                    .then(pixelColor => {
                        that.setState({ pixelColor });
                        let newPoints = JSON.parse(JSON.stringify(that.state.points));
                        newPoints.push({ x, y });
                        that.setState({
                            points: newPoints
                        });
                    }).catch(console.error);
            }
        });
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
        //将圆周均分4块，每45弧度取点坐标，理论上覆盖圆周
        for (var i = 0; i < 4; i++) {
            var pX = x + Math.sin(2 * Math.PI / 360 * 45 * i) * radius;
            var pY = y + Math.cos(2 * Math.PI / 360 * 45 * i) * radius;
            points.push({
                x: pX,
                y: pY
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
    renderPoints() {
        let pointsContainer = [];
        for (var i in this.state.points) {
            pointsContainer.push(<View key={this.randomStringId(10)} style={[styles.point, { top: this.state.points[i].y - 10, left: this.state.points[i].x - 10 }]} />);
        }
        return (<View style={{ position: "absolute", left: 0, top: 0, backgroundColor: "transparent", width: this.state.width, height: this.state.height }}>{pointsContainer}</View>);
    }
    render() {
        return (<View>
            <Animated.View
                style={{ backgroundColor: this.state.pixelColor, width: this.state.width, height: this.state.height }}
                {...this.panResponders.panHandlers}
            >
                <ImageBackground
                    style={{ width: this.state.width, height: this.state.height, backgroundColor: "white", resizeMode: "contain" }}
                    source={{ uri: this.props.bg }}>
                    {this.renderPoints()}
                </ImageBackground>
            </Animated.View>
            <View style={[styles.handle, { backgroundColor: this.state.pixelColor }]} />
            <View><Text>{this.state.pixelColor}</Text></View>
        </View>)
    }
}
const styles = StyleSheet.create({
    container: {
        flex: 1
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
