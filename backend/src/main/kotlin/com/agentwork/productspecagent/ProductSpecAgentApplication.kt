package com.agentwork.productspecagent

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class ProductSpecAgentApplication

fun main(args: Array<String>) {
    runApplication<ProductSpecAgentApplication>(*args)
}
