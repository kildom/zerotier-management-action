

export function ASSERT_TRUE(x: boolean) {
    if (!x) {
        throw new Error('Test assertion!!!');
    }
}


export function ASSERT_FALSE(x: boolean) {
    if (x) {
        throw new Error('Test assertion!!!');
    }
}


export function ASSERT_EQ(a: any, b: any) {
    if (a != b) {
        console.log('Not equal: ', a, '!=', b);
        throw new Error('Test assertion!!!');
    }
}

