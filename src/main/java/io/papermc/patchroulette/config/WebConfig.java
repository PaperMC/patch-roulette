package io.papermc.patchroulette.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;


@Configuration
public class WebConfig implements WebMvcConfigurer {
    public static final String DEFAULT_STARTING_PAGE = "public/frontend.html";
    public static final String DEV_STARTING_PAGE = "web/build/frontend.html";

    public static final boolean DEV = false;

    static class FrontendResolver extends PathResourceResolver {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            var requestedResource = location.createRelative(resourcePath);

            // Is this a request to a real file?
            if (requestedResource.exists() && requestedResource.isReadable()) {
                return requestedResource;
            }

            // try with html extension
            requestedResource = location.createRelative(resourcePath + ".html");
            if (requestedResource.exists() && requestedResource.isReadable()) {
                return requestedResource;
            }

            // It seems to be only a frontend-routing request (Single-Page-Application).
            return DEV ? new FileSystemResource(DEV_STARTING_PAGE) : new ClassPathResource(DEFAULT_STARTING_PAGE);
        }
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        ResourceHandlerRegistration handlerRegistration = registry.addResourceHandler("/**");

        if (DEV) {
            handlerRegistration.addResourceLocations("file:web/build/");
        } else {
            handlerRegistration.addResourceLocations("classpath:/public/");;
        }

        handlerRegistration
            .resourceChain(true)
            .addResolver(new FrontendResolver());
    }
}
