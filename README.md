# abstractus
A client-side utility web application that extracts data sets from an image of a graph.

## How to use

The entirety of the program's functionality is accessed via `index.html`. The data extraction is divided into sections:

1. Rotation correction (typically nothing happens here)
2. Bwify (black-and-whitify; you're free to submit a pull request if you have a better name)
3. Degridding (removal of grid lines)
4. Finalize (manual image cleaning, fragment manipulation, axis scale and independent variable control)
5. Export (downloads and options for data export)

Typically, a user should only be concerned with the Finalize and Export sections, only tweaking with the first three if the Finalize preview looks wrong.

### Rotation correction

Currently, there are no user input options for this section. The image is "frequenced" in the x- and y-axes, giving cumulative intensities for each column and row respectively. Permutations are made to the image rotation to maximize the intensity of the highest peak in the x spectrum (column).

Each iteration is shown in the expanded view, with the frequencing spectra shown, and the angle and quality (maximum cumulative column intensity) indicated at the bottom-right. If the image was already correctly rotated before loading, there should only be one iteration with `Angle: 0` shown.

### Bwify

The expanded view shows the post-bwification image. The cutoff between black and white can be controlled via the slider or the number entry. `-1` can be entered in the number input to reset it to the default value.

### Degridding

The expanded view shows the detected grid lines and options for controlling their individual margins. The three global parameters available are:

1. Detection threshold: the cumulative intensity in the column/row for it to register as a grid line, measured as a percentage of the highest cumulative intensity registered.

2. Slope threshold: after a grid line is detected, the bounds of the grid line "area" is extended in the positive and negative directions until |d(cumulative intensity)/dx| (or d/dy) drops below this threshold.

3. Default margin: after a grid line's span has been determined as above, a further margin of this number of pixels is added at its front and back. This may be overriden for individual grid lines in the expanded view.

### Finalize

There are several global options:

1. Independent variable: if x is the independent variable, the data sets will be y=f(x). Parametric curves 'looping back' along both x and y axes are not supported. This also impacts some of the export modes in the Export section.

2. Log scale: toggles whether the x- and y-axes are to be interpreted as logarithmic scales.

3. Curve editing mode: toggles between erasure mode (the default) and curve editing mode.

    - Erasure mode: click and drag to erase rectangles; shift-click and drag to restore; alt-click to erase one whole contiguous fragment. Use this to delete noise/artifacts from the data.

    - Curve editing mode: drag from node to node to create a connection; drag through blank space to cut connections; double-click on nodes to cap/uncap. Use this to fix things if the fragments aren't being correctly connected automatically.

3. Reset erasures/axes/curves: respectively, deletions made in erasure mode, the axis scales, and curve editing mode actions.

It may be helpful to keep an eye on the Export preview while working to catch any ticks or irregularities.

**IMPORTANT NOTE:** Curves cut by grid lines are automatically recognized connected by an algorithm; see `reduction.js` for details. However, curve recognition only works for disparate fragments---if there are intersecting curves in the image, the intersection must be erased. The curve recognition algorithm should then automatically match the fragments correctly to give the separate data sets.

**IMPORTANT NOTE 2:** If using erasure mode to cut through curves, make sure to make cuts *perpendicular* to the independent axis, or there will be "ticks" at the end due to how the data is resolved. Observe how the curve is automatically cleaned near erased grid lines.

### Export

Double-click a name to rename it and also highlight the curve it refers to.

There are three data export modes:

1. All data: one data point for every pixel along the independent variable axis.

2. Fixed intervals: data points at fixed intervals along the independent variable axis.

3. Fixed distances: data points are at fixed 2D distances from each other. More suitable than 'fixed interval' for curves that change gradient a lot.

The options at the top of the table next to the "Download All" link are global settings; setting mode or interval on the individual data sets creates an override. To return a data set to default settings, use the "Reset to default" option in the mode selection for mode, and input `-1` into the numerical input for interval.  

## Application architecture

The application is structured as below, as a monodirectional cascade of functions. Bolded, brackets names indicate input elements (if kebab-case, the element id), and those italicized as well indicate initial image upload and final data download elements. The plaintext names are functions.

The arrows indicate which functions call which. Without parameter modification, the image is uploaded at **`source-selector`** and the cascade progresses down the central column, with the data download generated at `recomputeExport()` and the UI rendering process terminated at `redrawExport()`.

<pre>
                                  <i><b>(source-selector)</b></i>
                                   onSourceChanged
                                          ▼
                                          ▼
                                    processBitmap
                                          ▼
                                          ▼
                                  recomputeRotation          | <b>(degrid-detection-slider)</b>
                                          ▼                  | setDegridDetectionThreshold
     <b>(bwify-thresh-slider)</b>                ▼                  | <b>(degrid-slope-slider)</b>
setBwifyIntensityThreshold ——————▶  recomputeBwify           | setDegridSlopeThreshold
                                          ▼                  | <b>(degrid-defmargin-number)</b>
                                          ▼                  | setDegridDefaultMargin
                                   recomputeDegrid   ◀—————— | <b>(individual grid line controls)</b>
                                          ▼
                                          ▼
                                    setupFinalize
                                          ▼
                                          ▼
                                  generateFinalizeUI
               <b>(uv-select)</b>                ▼ 
           uvSelectChanged                ▼
          <b>(reset erasures)</b> ——————▶    autoClean
                                          ▼
                                          ▼
                                  recomputeFragments ◀—————— <b>(clean UI actions)</b>
                                          ▼
<b>(curve editing UI actions)</b>                ▼
            <b>(reset curves)</b> ——————▶  rebuildCurves
                                          ▼                  | <b>(x-min-input, x-max-input,</b>
                                          ▼                  | <b> y-min-input, y-max-input)</b>
                                  redrawCurveEditor          | setBounds
                                          ▼                  | <b>(x-log, y-log)</b>
                                          ▼                  | setLog
               <i><b>(downloads)</b></i> ◀—————— recomputeExport   ◀—————— | <b>(reset axes)</b>
                    ▲                     ▼
                    ▲                     ▼
<b>(export parameter changes)</b> ——————▶  redrawExport
</pre>
