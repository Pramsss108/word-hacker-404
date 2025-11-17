#include "libraw/libraw.h"
#include <emscripten/emscripten.h>
#include <stdlib.h>
#include <string.h>

EMSCRIPTEN_KEEPALIVE
void* libraw_init_wrapper() {
    return libraw_init(0);
}

EMSCRIPTEN_KEEPALIVE
int libraw_open_buffer_wrapper(void* lr, void* buffer, size_t size) {
    return libraw_open_buffer((libraw_data_t*)lr, buffer, size);
}

EMSCRIPTEN_KEEPALIVE
int libraw_unpack_wrapper(void* lr) {
    return libraw_unpack((libraw_data_t*)lr);
}

EMSCRIPTEN_KEEPALIVE
int libraw_dcraw_process_wrapper(void* lr) {
    return libraw_dcraw_process((libraw_data_t*)lr);
}

EMSCRIPTEN_KEEPALIVE
void* libraw_get_image_wrapper(void* lr, int* width, int* height) {
    libraw_processed_image_t* img = libraw_dcraw_make_mem_image((libraw_data_t*)lr, NULL);
    if (img) {
        *width = img->width;
        *height = img->height;
        return img->data;
    }
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
void libraw_close_wrapper(void* lr) {
    libraw_close((libraw_data_t*)lr);
}
