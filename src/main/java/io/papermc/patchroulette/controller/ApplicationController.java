package io.papermc.patchroulette.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class ApplicationController {

    @GetMapping("/")
    public View index() {
        // no clue why the fallback is not working for / 🤷‍♂️
        return new RedirectView("/login");
    }
}
