package com.external.plugins;

import com.appsmith.external.dtos.ExecuteActionDTO;
import com.appsmith.external.exceptions.pluginExceptions.AppsmithPluginError;
import com.appsmith.external.exceptions.pluginExceptions.AppsmithPluginException;
import com.appsmith.external.helpers.restApiUtils.connections.APIConnection;
import com.appsmith.external.helpers.restApiUtils.helpers.RequestCaptureFilter;
import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionRequest;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.BearerTokenAuth;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.TriggerRequestDTO;
import com.appsmith.external.models.TriggerResultDTO;
import com.appsmith.external.plugins.BasePlugin;
import com.appsmith.external.plugins.BaseRestApiPluginExecutor;
import com.appsmith.external.services.SharedConfig;
import com.external.plugins.models.OpenAIRequestDTO;
import com.external.plugins.utils.RequestUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.pf4j.PluginWrapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.external.plugins.constants.OpenAIConstants.DATA;
import static com.external.plugins.constants.OpenAIConstants.ID;
import static com.external.plugins.constants.OpenAIConstants.MODEL;

@Slf4j
public class OpenAiPlugin extends BasePlugin {

    public OpenAiPlugin(PluginWrapper wrapper) {
        super(wrapper);
    }

    public static class OpenAiPluginExecutor extends BaseRestApiPluginExecutor {

        private static OpenAiPluginExecutor instance;

        public OpenAiPluginExecutor(SharedConfig config) {
            super(config);
        }

        public static OpenAiPluginExecutor getInstance(SharedConfig sharedConfig) {
            if (instance == null) {
                instance = new OpenAiPluginExecutor(sharedConfig);
            }
            return instance;
        }

        @Override
        public Mono<ActionExecutionResult> executeParameterized(
                APIConnection connection,
                ExecuteActionDTO executeActionDTO,
                DatasourceConfiguration datasourceConfiguration,
                ActionConfiguration actionConfiguration) {
            prepareConfigurationsForExecution(executeActionDTO, actionConfiguration, datasourceConfiguration);

            // Get prompt from action configuration
            List<Map.Entry<String, String>> parameters = new ArrayList<>();

            prepareConfigurationsForExecution(executeActionDTO, actionConfiguration, datasourceConfiguration);
            // Filter out any empty headers
            headerUtils.removeEmptyHeaders(actionConfiguration);
            headerUtils.setHeaderFromAutoGeneratedHeaders(actionConfiguration);

            return this.executeCommon(connection, datasourceConfiguration, actionConfiguration, parameters);
        }

        public Mono<ActionExecutionResult> executeCommon(
                APIConnection apiConnection,
                DatasourceConfiguration datasourceConfiguration,
                ActionConfiguration actionConfiguration,
                List<Map.Entry<String, String>> insertedParams) {

            // Initializing object for error condition
            ActionExecutionResult errorResult = new ActionExecutionResult();
            initUtils.initializeResponseWithError(errorResult);

            // Set of hint messages that can be returned to the user.
            Set<String> hintMessages = new HashSet<>();

            // Initializing request URL
            URI uri = RequestUtils.createUri(actionConfiguration);

            ActionExecutionRequest actionExecutionRequest =
                    RequestCaptureFilter.populateRequestFields(actionConfiguration, uri, insertedParams, objectMapper);

            WebClient.Builder webClientBuilder =
                    restAPIActivateUtils.getWebClientBuilder(actionConfiguration, datasourceConfiguration);
            String reqContentType = headerUtils.getRequestContentType(actionConfiguration, datasourceConfiguration);

            /* Check for content type */
            final String contentTypeError = headerUtils.verifyContentType(actionConfiguration.getHeaders());
            if (contentTypeError != null) {
                errorResult.setErrorInfo(
                        new AppsmithPluginException(AppsmithPluginError.PLUGIN_EXECUTE_ARGUMENT_ERROR));
                errorResult.setRequest(actionExecutionRequest);
                return Mono.just(errorResult);
            }

            HttpMethod httpMethod = HttpMethod.POST;
            OpenAIRequestDTO openAIRequestDTO = RequestUtils.makeRequestBody(actionConfiguration);

            // Authentication will already be valid at this point
            final BearerTokenAuth bearerTokenAuth = (BearerTokenAuth) datasourceConfiguration.getAuthentication();
            assert (bearerTokenAuth.getBearerToken() != null);

            return RequestUtils.makeRequest(httpMethod, uri, bearerTokenAuth, BodyInserters.fromValue(openAIRequestDTO))
                    .flatMap(responseEntity -> {
                        HttpStatusCode statusCode = responseEntity.getStatusCode();
                        HttpHeaders headers = responseEntity.getHeaders();

                        ActionExecutionResult actionExecutionResult = new ActionExecutionResult();
                        actionExecutionResult.setRequest(actionExecutionRequest);
                        actionExecutionResult.setStatusCode(statusCode.toString());

                        if (!statusCode.is2xxSuccessful()) {
                            actionExecutionResult.setIsExecutionSuccess(false);
                            return Mono.just(actionExecutionResult);
                        }

                        actionExecutionResult.setIsExecutionSuccess(true);
                        actionExecutionResult.setBody(responseEntity.getBody());
                        return Mono.just(actionExecutionResult);
                    });
        }

        @Override
        public Set<String> validateDatasource(DatasourceConfiguration datasourceConfiguration) {
            return datasourceUtils.validateDatasource(datasourceConfiguration, false);
        }

        @Override
        public Mono<TriggerResultDTO> trigger(
                APIConnection connection, DatasourceConfiguration datasourceConfiguration, TriggerRequestDTO request) {

            // Authentication will already be valid at this point
            final BearerTokenAuth bearerTokenAuth = (BearerTokenAuth) datasourceConfiguration.getAuthentication();
            assert (bearerTokenAuth.getBearerToken() != null);

            HttpMethod httpMethod = HttpMethod.GET;
            URI uri = RequestUtils.createUriFromCommand(MODEL);

            return RequestUtils.makeRequest(httpMethod, uri, bearerTokenAuth, BodyInserters.empty())
                    .flatMap(responseEntity -> {
                        if (!responseEntity.getStatusCode().is2xxSuccessful()) {
                            return Mono.error(
                                    new AppsmithPluginException(AppsmithPluginError.PLUGIN_GET_STRUCTURE_ERROR));
                        }

                        try {
                            return Mono.just(objectMapper.readValue(
                                    responseEntity.getBody(), new TypeReference<Map<String, Object>>() {}));
                        } catch (JsonProcessingException ex) {
                            return Mono.error(
                                    new AppsmithPluginException(AppsmithPluginError.PLUGIN_GET_STRUCTURE_ERROR));
                        }
                    })
                    .map(data -> {
                        List<Map<String, String>> modelList = new ArrayList<>();

                        if (!data.containsKey(DATA)) {
                            return new TriggerResultDTO(modelList);
                        }

                        List<Object> models = (List<Object>) data.get(DATA);
                        for (Object model : models) {

                            Map<String, Object> modelMap = (Map<String, Object>) model;

                            if (!modelMap.containsKey("id")) {
                                continue;
                            }

                            String modelId = (String) modelMap.get(ID);
                            Map<String, String> responseMap = new HashMap<>();
                            responseMap.put("label", modelId);
                            responseMap.put("value", modelId);
                            modelList.add(responseMap);
                        }
                        return new TriggerResultDTO(modelList);
                    });
        }
    }
}
