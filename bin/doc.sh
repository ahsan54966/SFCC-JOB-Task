#!/usr/bin/env bash

# Generate doc and styleguide

# clean up old doc/dist directory
rm -rf doc/dist && \
    # jsdoc server-side JS
    jsdoc . -c doc/js/server/conf.json -d doc/dist/js/server -R app_storefront_controllers/README.md && \
    # jsdoc client-side JS
    jsdoc . -c doc/js/client/conf.json -d doc/dist/js/client -R app_storefront_core/cartridge/js/README.md && \
    # styleguide
    mkdir -p doc/dist/styleguide && \
    node-sass doc/styleguide/scss/main.scss | postcss -u autoprefixer -o doc/dist/styleguide/main.css && \
    browserify doc/styleguide/js/main.js -t hbsfy -o doc/dist/styleguide/main.js && \
    # copy static assets
    cp doc/index.html doc/dist/index.html && \
    cp doc/styleguide/index.html doc/dist/styleguide/ && \
    cp -r doc/styleguide/lib/ doc/dist/styleguide/lib && \
    cp -r doc/styleguide/templates/ doc/dist/styleguide/templates && \
    # server the files locally
    http-server doc/dist -p 5000
