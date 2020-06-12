let outputBounds = [0,1,0,1]; // xmin xmax ymin ymax

function setOutputBounds(input, target) {
    const value = parseInt(input.value);
    if(value == undefined) {
        input.value = outputBounds[target];
    } else {
        outputBounds[i] = value;
        recomputeOutput();
    }
}

function recomputeOutput() {

}