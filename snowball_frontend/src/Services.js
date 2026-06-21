import axios from "axios";
const serverURL = process.env.serverURL || 'http://localhost:5000'

// Cache for deduplicating requests
const pendingRequests = new Map();

const postData = async (url, body) => {
    try {
        // Create a unique key for this request
        const requestKey = `${url}-${JSON.stringify(body)}`;

        // If same request is already in progress, return that promise
        if (pendingRequests.has(requestKey)) {
            return pendingRequests.get(requestKey);
        }

        // Make the request
        const requestPromise = (async () => {
            try {
                const response = await axios.post(`${serverURL}/${url}`, body);
                const result = response.data;
                return result;
            } catch (e) {
                return null;
            } finally {
                // Remove from cache after 2 seconds
                setTimeout(() => {
                    pendingRequests.delete(requestKey);
                }, 2000);
            }
        })();

        // Store the promise
        pendingRequests.set(requestKey, requestPromise);

        return requestPromise;
    } catch (e) {
        return null;
    }
}

const getData = async (url) => {
    try {
        // Create a unique key for this request
        const requestKey = `GET-${url}`;

        // If same request is already in progress, return that promise
        if (pendingRequests.has(requestKey)) {
            return pendingRequests.get(requestKey);
        }

        // Make the request
        const requestPromise = (async () => {
            try {
                const response = await axios.get(`${serverURL}/${url}`);
                const result = response.data;
                return result;
            } catch (e) {
                return null;
            } finally {
                // Remove from cache after 2 seconds
                setTimeout(() => {
                    pendingRequests.delete(requestKey);
                }, 2000);
            }
        })();

        // Store the promise
        pendingRequests.set(requestKey, requestPromise);

        return requestPromise;
    } catch (e) {
        return null;
    }
}

export { serverURL, postData, getData }