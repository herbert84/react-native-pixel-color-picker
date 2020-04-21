import { Dimensions } from 'react-native';

function convertDimensionToNumber (dimension, screenDimension) {
    if (typeof dimension === 'string' && dimension.includes('%')) {
        const decimal = Number(dimension.replace(/%/, '')) / 100;
        return decimal * screenDimension;
    }

    if (typeof dimension === 'number') {
        return dimension;
    }
    return Number(dimension);
}

const getTooltipCoordinate = (
    x,
    y,
    width,
    height,
    ScreenWidth,
    ScreenHeight,
    receivedTooltipWidth,
    receivedTooltipHeight,
    withPointer,
) => {
    const screenDims = Dimensions.get('screen');

    const tooltipWidth = convertDimensionToNumber(
        receivedTooltipWidth,
        screenDims.width,
    );
    const tooltipHeight = convertDimensionToNumber(
        receivedTooltipHeight,
        screenDims.height,
    );

    let centerX = ScreenWidth / 2;
    let ind = 0;
    if (x < centerX)
        ind = 0;
    else
        ind = 1;
    return {
        x: constraintX(x, ind, ScreenWidth, tooltipWidth),
        y: y - tooltipHeight / 2 + 10
    }
};

const constraintX = (
    newX,
    qIndex,
    ScreenWidth,
    tooltipWidth,
) => {
    switch (qIndex) {
        // 0 is the left side quadrants.
        case 0: {
            return newX + 30
        }
        // 1 is the right side quadrants
        case 1: {
            return newX - tooltipWidth - 10;
        }
        default: {
            return 0;
        }
    }
};

export default getTooltipCoordinate;