#!/usr/bin/env python
# Licensed under a 3-clause BSD style license - see LICENSE.rst
#
# Standard imports
#
import glob
import os
import sys
#
# setuptools' sdist command ignores MANIFEST.in
#
from distutils.command.sdist import sdist as DistutilsSdist
from setuptools import setup, find_packages
#
# DESI support code.
#
import desiutil.setup as ds
#
# Begin setup
#
setup_keywords = dict()
#
# THESE SETTINGS NEED TO BE CHANGED FOR EVERY PRODUCT.
#
setup_keywords['name'] = 'prospect'
setup_keywords['description'] = 'DESI spectrum visualization package'
setup_keywords['author'] = 'DESI Collaboration'
setup_keywords['author_email'] = 'desi-data@desi.lbl.gov'
setup_keywords['license'] = 'BSD'
setup_keywords['url'] = 'https://github.com/desihub/prospect'
#
# END OF SETTINGS THAT NEED TO BE CHANGED.
#
setup_keywords['version'] = ds.get_version(setup_keywords['name'])
#
# Use README.rst as long_description.
#
setup_keywords['long_description'] = ''
if os.path.exists('README.rst'):
    with open('README.rst') as readme:
        setup_keywords['long_description'] = readme.read()
#
# Set other keywords for the setup function.  These are automated, & should
# be left alone unless you are an expert.
#
# Treat everything in bin/ except *.rst as a script to be installed.
#
if os.path.isdir('bin'):
    setup_keywords['scripts'] = [fname for fname in glob.glob(os.path.join('bin', '*'))
        if not os.path.basename(fname).endswith('.rst')]
setup_keywords['provides'] = [setup_keywords['name']]
setup_keywords['python_requires'] = '>=3.5'
setup_keywords['zip_safe'] = False
setup_keywords['use_2to3'] = False
setup_keywords['packages'] = find_packages('py')
setup_keywords['package_dir'] = {'': 'py'}
setup_keywords['cmdclass'] = {'module_file': ds.DesiModule,
                              'version': ds.DesiVersion,
                              'test': ds.DesiTest,
                              'api': ds.DesiAPI,
                              'sdist': DistutilsSdist}
setup_keywords['test_suite']='{name}.test.{name}_test_suite'.format(**setup_keywords)
#
# Autogenerate command-line scripts.
#
# setup_keywords['entry_points'] = {'console_scripts':['run_cmx_htmlfiles = prospect.scripts.prepare_cmx_htmlfiles:main',
#                                                      'run_htmlfiles = prospect.scripts.prepare_htmlfiles:main',
#                                                      'run_specview_cmx_coadds = prospect.scripts.specview_cmx_coadds:main',
#                                                      'run_specview_cmx_frames = prospect.scripts.specview_cmx_frames:main',
#                                                      'run_specview_cmx_targets = prospect.scripts.specview_cmx_targets:main',
#                                                      'run_specview_per_night = prospect.scripts.specview_per_night:main',
#                                                      'run_specview_per_pixel = prospect.scripts.specview_per_pixel:main']}
#
# Add internal data directories.
#
setup_keywords['package_data'] = {'prospect': ['data/*', 'js/*', 'templates/*'],}
#                                   'prospect.test': ['t/*']}
#
# Run setup command.
#
setup(**setup_keywords)