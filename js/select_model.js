// CustomJS, callback for the model selection
//  - Requires to include function in: interp_grid.js, smooth_data.js
//  - args = ifiberslider, model_select, fit_templates, cds_model_2ndfit, cds_model, z_input
//             cds_othermodel, fit_results, std_templates, median_spectra, spec_wave, smootherslider,
//             cds_targetinfo
// IN DEVLPT
// values for model_select (model_options) are hardcoded
// TODO : add smootherslider info (nsmooth, see code in update_plot )


function median(numbers) {
    var median = 0
    var arr = numbers.slice()
    arr.sort()
    if ( arr.length % 2 === 0 ) { // is even
        median = (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
    } else { // is odd
        median = arr[(arr.length - 1) / 2]
    }
    return median
}

var spec_z = 0.0

if (model_select.value == 'Best fit') {
    var origflux = cds_model.data['origflux'+ifiberslider.value]
    cds_othermodel.data['plotflux'] = origflux.slice()
    cds_othermodel.data['plotwave'] = cds_model.data['plotwave'].slice()
    cds_othermodel.data['origwave'] = cds_model.data['origwave'].slice()
    spec_z = cds_targetinfo.data['z'][ifiberslider.value]

} else if (model_select.value == '2nd best fit') {
    var origflux = cds_model_2ndfit.data['origflux'+ifiberslider.value]
    cds_othermodel.data['plotflux'] = origflux.slice()
    cds_othermodel.data['plotwave'] = cds_model_2ndfit.data['plotwave']
    cds_othermodel.data['origwave'] = cds_model_2ndfit.data['origwave']
    spec_z = fit_results['Z'][ifiberslider.value][1] // entry "1" => 2nd best fit
    
} else if ( (model_select.value).search("STD ") == 0) {
    // TODO : adapt median to relevant waverange (fct of z_spec at least).
    var template_key = (model_select.value).slice(4)
    var median_goal = median_spectra.data['median'][ifiberslider.value]
    var median_template = median(std_templates["flux_"+template_key])

    var scaled_template_flux = std_templates["flux_"+template_key].slice()
    for (var i=0; i<scaled_template_flux.length; i++) {
        scaled_template_flux[i] = scaled_template_flux[i]*median_goal/median_template
    }
    cds_othermodel.data['plotflux'] = scaled_template_flux

    if ( (model_select.value).search("GALAXY") > -1) spec_z = 0.7
    if ( (model_select.value).search("QSO") > -1) spec_z = 1.5
    var shifted_template_wave = std_templates["wave_"+template_key].slice()
    for (var i=0; i<shifted_template_wave.length; i++) {
        shifted_template_wave[i] = shifted_template_wave[i]*(1+spec_z)
    }
    cds_othermodel.data['plotwave'] = shifted_template_wave.slice()
    cds_othermodel.data['origwave'] = shifted_template_wave.slice()
    
} else { // recompute Nth best fit
    var i_fit = parseInt(model_select.value[0])-1 // hardcoded ("1st fit" => "1" => entry 0)
    var coeffs = fit_results['COEFF'][ifiberslider.value][i_fit]
    var spectype =  fit_results['SPECTYPE'][ifiberslider.value][i_fit]
    var subtype =  fit_results['SUBTYPE'][ifiberslider.value][i_fit]
    spec_z = fit_results['Z'][ifiberslider.value][i_fit]

    var template_wave = fit_templates["wave_"+spectype+"_"+subtype]
    var template_flux = fit_templates["flux_"+spectype+"_"+subtype]

    var model_wave = template_wave.slice()
    var model_flux = template_wave.slice()
    for (var j=0; j<model_wave.length; j++) {
        model_wave[j] = model_wave[j]*(1+spec_z)
        model_flux[j] = 0
        for (var i=0; i<template_flux.length; i++) {
            model_flux[j] += (coeffs[i]*template_flux[i][j])
        }
    }

    // TODO/check : need to do that ??? (probably not)
    shifted_flux = spec_wave.slice()
    for (var j=0; j<shifted_flux.length; j++) {
        shifted_flux[j] = interp_grid(spec_wave[j], model_wave, model_flux)
    }
    cds_othermodel.data['plotwave'] = spec_wave
    cds_othermodel.data['origwave'] = spec_wave
    cds_othermodel.data['plotflux'] = shifted_flux
}

var zref_vect = (cds_othermodel.data['plotwave']).slice() // trick to keep track of spec_z (see plotframes.py)
for (var j=0; j<zref_vect.length; j++) zref_vect[j] = spec_z
cds_othermodel.data['zref'] = zref_vect

// Smooth plotflux
nsmooth = smootherslider.value
if (nsmooth > 0) {
    var kernel = [];
    for(var i=-2*nsmooth; i<=2*nsmooth; i++) {
        kernel.push(Math.exp(-(i**2)/(2*nsmooth)))
    }
    var kernel_offset = Math.floor(kernel.length/2)
    var smoothed_flux = smooth_data(cds_othermodel.data['plotflux'], kernel, kernel_offset)
    cds_othermodel.data['plotflux'] = smoothed_flux
}

// Change value for z_input
z_input.value = spec_z.toFixed(4)

cds_othermodel.change.emit()
