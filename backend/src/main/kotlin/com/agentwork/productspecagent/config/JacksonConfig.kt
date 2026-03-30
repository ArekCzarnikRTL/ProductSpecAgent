package com.agentwork.productspecagent.config

import kotlinx.serialization.json.Json
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.converter.json.KotlinSerializationJsonHttpMessageConverter

@Configuration
class KotlinSerializationConfig {

    @Bean
    fun kotlinSerializationJsonConverter(): KotlinSerializationJsonHttpMessageConverter {
        val json = Json {
            encodeDefaults = true
            ignoreUnknownKeys = true
        }
        return KotlinSerializationJsonHttpMessageConverter(json)
    }
}

