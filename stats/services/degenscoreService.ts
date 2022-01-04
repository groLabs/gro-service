import axios from 'axios';

async function postDegenScore(body) {
    const response = await axios.post('https://degenscore.com/api/gro', body, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return response.data;
}
export {
    postDegenScore,
};
