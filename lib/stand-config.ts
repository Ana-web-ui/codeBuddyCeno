
export type StandLayout = 
| 'front'
| 'corner'
| 'peninsula'
| 'island'
| 'custom';

export type FrontRotation = 0 | 90 | 180 | 270;

export type CornerOpenSide = 'left' | 'right';

export type StandWalls ={
    back: boolean;
    left: boolean;
    right: boolean;
};

export function getStandWalls(
    layout: StandLayout,
    cornerOpenSide: CornerOpenSide,
    currentWalls: StandWalls,
): StandWalls {
    switch(layout) {
        case 'front' :
            return {
                back: true,
                left: true,
                right: true,
            };

        case 'corner' :
            return {
                back: true,
                left: cornerOpenSide === 'right',
                right: cornerOpenSide ==='left',
            };
            
        case 'peninsula' :
            return {
                back: true,
                left: false,
                right: false,
            };

        case 'island':
            return {
                back: false,
                left: false,
                right: false,
            };

        case 'custom' : 
            return{
                back: currentWalls.back,
                left: currentWalls.left,
                right: currentWalls.right
            };
        }
}