// update_plot() CustomJS
// Requires to include functions in: adapt_plotrange.js, coadd_brz_cameras.js,
//     interp_grid.js, smooth_data.js
//
// TODO : optimize : if cd_obj==smootherslider don't need to do everything... (change imaging data etc)
//
// One of these will have changed.
//
var ifiber = ifiberslider.value;
var nsmooth = smootherslider.value;

//
// Smoothing kernel.
//
var kernel = [];
if (nsmooth > 0)
    for(var i=-2*nsmooth; i<=2*nsmooth; i++)
        kernel.push(Math.exp(-(i**2)/(2*(nsmooth**2))));
//
// update VI widgets + infos for current spectrum
//
if (cb_obj == ifiberslider) {
    //
    // Update metadata.
    //
    shortcds_table_a.data['TARGETID'] = [ metadata.data['TARGETID'][ifiber] ];
    shortcds_table_a.data['Target class'] = [ metadata.data['target_info'][ifiber] ];
    if (metadata.data.hasOwnProperty('mag_W1')) {
        shortcds_table_a.data['mag_G'] = [ metadata.data['mag_G'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_R'] = [ metadata.data['mag_R'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_Z'] = [ metadata.data['mag_Z'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_W1'] = [ metadata.data['mag_W1'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_W2'] = [ metadata.data['mag_W2'][ifiber].toFixed(2) ];
    } else {
        shortcds_table_a.data['mag_u'] = [ metadata.data['mag_u'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_g'] = [ metadata.data['mag_g'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_r'] = [ metadata.data['mag_r'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_i'] = [ metadata.data['mag_i'][ifiber].toFixed(2) ];
        shortcds_table_a.data['mag_z'] = [ metadata.data['mag_z'][ifiber].toFixed(2) ];
    }
    shortcds_table_a.change.emit()
    if (metadata.data['Z'] != undefined && shortcds_table_z != null) {
        if (fit_results != undefined) {
            shortcds_table_z.data['SPECTYPE'] = fit_results['SPECTYPE'][ifiberslider.value].slice(); // (0,num_best_fits)
            shortcds_table_z.data['SUBTYPE'] = fit_results['SUBTYPE'][ifiberslider.value].slice();
            shortcds_table_z.data['Z'] = fit_results['Z'][ifiberslider.value].slice();
            shortcds_table_z.data['ZERR'] = fit_results['ZERR'][ifiberslider.value].slice();
            shortcds_table_z.data['ZWARN'] = fit_results['ZWARN'][ifiberslider.value].slice();
            var chi2s = fit_results['CHI2'][ifiberslider.value].slice(); // Custom DeltaChi2 calculation
            var full_deltachi2s = [];
            for (var i=0; i<fit_results['Nfit']-1; i++) {
                full_deltachi2s.push(chi2s[i+1]-chi2s[i]);
            }
            full_deltachi2s.push(-1);
            shortcds_table_z.data['DELTACHI2'] = full_deltachi2s;
            for (var i=0; i<fit_results['Nfit']; i++) {
                shortcds_table_z.data['Z'][i] = shortcds_table_z.data['Z'][i].toFixed(4);
                shortcds_table_z.data['ZERR'][i] = shortcds_table_z.data['ZERR'][i].toFixed(4);
                shortcds_table_z.data['DELTACHI2'][i] = shortcds_table_z.data['DELTACHI2'][i].toFixed(1);
            }
        } else {
            shortcds_table_z.data['SPECTYPE'] = [ metadata.data['SPECTYPE'][ifiber] ];
            shortcds_table_z.data['SUBTYPE'] = [ metadata.data['SUBTYPE'][ifiber] ];
            shortcds_table_z.data['Z'] = [ metadata.data['Z'][ifiber].toFixed(4) ];
            shortcds_table_z.data['ZERR'] = [ metadata.data['ZERR'][ifiber].toFixed(4) ];
            shortcds_table_z.data['ZWARN'] = [ metadata.data['ZWARN'][ifiber] ];
            shortcds_table_z.data['DELTACHI2'] = [ metadata.data['DELTACHI2'][ifiber].toFixed(1) ];
        }
        shortcds_table_z.change.emit();
    }
    //
    // Update VI
    //
    vi_std_comment_select.value = ' ';
    vi_comment_input.value = metadata.data['VI_comment'][ifiber];
    vi_name_input.value = (metadata.data['VI_scanner'][ifiber]).trim();
    vi_class_input.active = vi_class_labels.indexOf(metadata.data['VI_class_flag'][ifiber]); // -1 if nothing
    var issues_on = [];
    for (var i=0; i<vi_issue_slabels.length; i++) {
        if ( (metadata.data['VI_issue_flag'][ifiber]).indexOf(vi_issue_slabels[i]) >= 0 ) {
            issues_on.push(i);
        }
    }
    vi_issue_input.active = issues_on;
    vi_z_input.value = (metadata.data['VI_z'][ifiber]).trim();
    if (metadata.data['VI_spectype'][ifiber] == '' ) {
        vi_category_select.value = ' '; // setting value='' does not work well with Select
    } else {
        vi_category_select.value = metadata.data['VI_spectype'][ifiber];
    }

    //
    // update target image
    //
    if (imfig_source) {
        imfig_source.data.url[0] = imfig_urls[ifiber][0];
        imfig_source.data.txt[0] = imfig_urls[ifiber][2];
        imfig_source.change.emit();
    }
}
//
// Update redshift.
//
if (metadata.data['Z'] != undefined && cb_obj == ifiberslider && model_select == undefined) {
    // if model_select is defined : this will be done in select_model.
    z_input.value = metadata.data['Z'][ifiber].toFixed(4);
}
//
// Smooth plot and recalculate ymin/ymax.
//
var ymin = 0.0;
var ymax = 0.0;
// Switch for ivar-weighting in smoothing. We normally want this true unless
// nsmooth == 0, to simplify some of the logic below.
var ivar_weight = nsmooth > 0;
var valid_y_range = false;
for (var i=0; i<spectra.length; i++) {
    // console.log("Updating spectrum " + (i+1) + " (of " + spectra.length + ") of object " + ifiber + ".");
    var data = spectra[i].data;
    var origflux = data['origflux'+ifiber];
    if (origflux.filter(isFinite).length == 0) {
        alert("Spectrum " + (i+1) + " (of " + spectra.length + ") of object " + ifiber + " has no valid data!");
        data["plotflux"] = (function(){ var foo = []; for (var j=0; j<origflux.length; j++) foo.push(1.0); return foo;})();
        if ("plotnoise" in data) data["plotnoise"] = data["plotflux"].slice();
    } else {
        if ('plotnoise' in data) {
            var orignoise = data['orignoise'+ifiber];
            var ivar = [];
            for (var j=0; j<orignoise.length; j++) ivar.push( orignoise[j] > 0 ? 1.0/(orignoise[j])**2 : 0 );
            data["plotflux"] = smooth_data(origflux, kernel, {"ivar_in": ivar, "ivar_weight": ivar_weight});
            data["plotnoise"] = smooth_noise((ivar_weight ? ivar : orignoise), kernel, {"ivar_weight": ivar_weight});
        } else {
            data["plotflux"] = smooth_data(origflux, kernel, {"ivar_weight": false});
        }
        var y_vect = []; // ymin/ymax calculation is based on pixels in fig.x_range
        for (var i_pix=0; i_pix<data['plotflux'].length; i_pix++) {
            if ( (data['plotwave'][i_pix] > fig.x_range.start ) && (data['plotwave'][i_pix] < fig.x_range.end) ) {
                y_vect.push(data['plotflux'][i_pix])
            }
        }
        if (y_vect.length > 0) {
            var tmp = adapt_plotrange(0.01, 0.99, y_vect);
            ymin = Math.min(ymin, tmp[0]);
            ymax = Math.max(ymax, tmp[1]);
        }
        valid_y_range = isFinite(ymin) && isFinite(ymax);
    }
    spectra[i].change.emit();
}
//
// After initial limits are calculated by adapt_plotrange(), add some
// extra padding.
//
if (valid_y_range) {
    fig.y_range.start = ymin < 0 ? ymin * 1.4 : ymin * 0.6;
    fig.y_range.end = ymax * 1.4;
}
//
// update camera-coadd
// Here I choose to do coaddition on the smoothed spectra (should be ok?)
//
if (coaddcam_spec) {
    var wave_in = [];
    var flux_in = [];
    var noise_in = [];
    for (var i=0; i<3; i++) {
        var data = spectra[i].data;
        wave_in.push(data['plotwave'].slice());
        flux_in.push(data['plotflux'].slice());
        if ('plotnoise' in data) {
            noise_in.push(data['plotnoise'].slice());
        } else {
            var dummy_noise = [];
            for (var j=0; j<data['plotflux'].length; j++) dummy_noise.push(1);
            noise_in.push(dummy_noise);
        }
    }
    var coadd_infos = coadd_brz_cameras(wave_in, flux_in, noise_in);
    coaddcam_spec.data['plotwave'] = coadd_infos[0].slice();
    coaddcam_spec.data['plotflux'] = coadd_infos[1].slice();
    coaddcam_spec.data['plotnoise'] = coadd_infos[2].slice();
    coaddcam_spec.change.emit();
}
//
// update model
//
if (model) {
    model.data['plotflux'] = smooth_data(model.data['origflux'+ifiber], kernel, {});
    model.change.emit();
}
//
// update other model
//
if (othermodel) {
    if (cb_obj == smootherslider) {
        othermodel.data['plotflux'] = smooth_data(othermodel.data['origflux'], kernel, {});
        othermodel.change.emit();
    } else if (cb_obj == ifiberslider) {
        // Trick to trigger execution of select_model.js
        // Reset othermodel to best fit. Smoothing is done in select_model.js
        var trigger_value = model_select.options[0];
        if (model_select.value == trigger_value) {
            trigger_value = model_select.options[1];
        }
        model_select.value = trigger_value;
        model_select.value = 'Best fit';
    }
}
