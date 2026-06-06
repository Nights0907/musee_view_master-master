import Axios from '@/axios/axiosPlugin.js';
import { globalState } from '@/utils/store.js';
import { commonGlobalState } from '@/utils/commonStore.js';
import { sendDefault, sendGuide, sendMistake, sendFeynman, sendexplanation } from '@/utils/handleChatRequest.js';

export const recordSendDefault = (formData) => recognizeAndSend(formData, sendDefault);

export const recordSendMistake = (formData) => recognizeAndSend(formData, sendMistake);

export const recordSendGuide = (formData) => recognizeAndSend(formData, sendGuide);

export const recordSendFeynman = (formData) => recognizeAndSend(formData, sendFeynman);

export const recordSendexplanation = (formData) => recognizeAndSend(formData, sendexplanation);

function recognizeAndSend(formData, sendText) {
    commonGlobalState.warntitle = '正在识别语音~';
    commonGlobalState.dialogVisible = true;

    Axios({
        method: 'post',
        url: '/api/student/speech/recognize',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }).then(function (response) {
        const recognizedText = response.data.data;
        if (!recognizedText) {
            commonGlobalState.dialogVisible = false;
            return;
        }
        commonGlobalState.warntitle = '小沐正在努力思考~';
        sendText(recognizedText);
    }).catch(function (error) {
        commonGlobalState.dialogVisible = false;
        console.error('语音识别失败', error);
    });
}

export const getCommunication = () => Axios({
    method: 'get',
    url: '/api/student/question/communication',
    params: {
        "qid": globalState.history[0].qid,
    }
}).then(function (response) {
    if (response.data.data === undefined) {
        commonGlobalState.btnflag = true;
        globalState.dialogueArray = [];
    } else {
        commonGlobalState.btnflag = false;
        globalState.dialogueArray = response.data.data.wenxinChatHistory.map((item, index) => {
            const speaker = index % 2 === 0 ? "user" : "assistant";
            return {
                speaker: speaker,
                message: speaker === "user" ? (item.displayUser || item.user) : item.assistant,
                avatarSrc: speaker === "user" ? "user-avatar.jpg" : "assistant-avatar.jpg",
                timestamp: new Date().toLocaleString()
            };
        });
        commonGlobalState.dialogVisible = false;
    }
}).catch(function (error) {
    console.error('发送失败', error);
});

export const getWrong = () => Axios({
    method: 'get',
    url: '/api/student/question/communication/wrongAnswer',
    params: {
        "qid": globalState.history[0].qid,
    }
}).then(function (response) {
    if (response.data.data === undefined) {
        commonGlobalState.btnflag = true;
        globalState.dialogueArray = [];
    } else {
        commonGlobalState.btnflag = false;
        globalState.dialogueArray = response.data.data.wenxinChatHistory.map((item, index) => {
            const speaker = index % 2 === 0 ? "user" : "assistant";
            return {
                speaker: speaker,
                message: speaker === "user" ? (item.displayUser || item.user) : item.assistant,
                avatarSrc: speaker === "user" ? "user-avatar.jpg" : "assistant-avatar.jpg",
                timestamp: new Date().toLocaleString()
            };
        });
    }

}).catch(function (error) {
    console.error('发送失败', error);
});


export const getIns = () => Axios({
    method: 'get',
    url: '/api/student/chat/inspiration/history',
    params: {
        "qid": globalState.history[0].qid,
    }
}).then(function (response) {
    if (response.data.data === undefined) {
        commonGlobalState.btnflag = true;
        globalState.dialogueArray = [];
    } else {
        commonGlobalState.btnflag = false;

        console.log('发送成功', response);
        globalState.dialogueArray = response.data.data.wenxinChatHistory.map((item, index) => {
            const speaker = index % 2 === 0 ? "user" : "assistant";
            return {
                speaker: speaker,
                message: speaker === "user" ? (item.displayUser || item.user) : item.assistant,
                avatarSrc: speaker === "user" ? "user-avatar.jpg" : "assistant-avatar.jpg",
                timestamp: new Date().toLocaleString()
            };
        });
        commonGlobalState.dialogVisible = false;
    }
}).catch(function (error) {
    console.error('发送失败', error);
});

export const getPersonalCom = () => Axios({
    method: 'get',
    url: '/api/student/chat/explanation/history',
    params: {
        "qid": globalState.history[0].qid,
    }
}).then(function (response) {
    if (response.data.data === undefined) {
        commonGlobalState.btnflag = true;
        globalState.dialogueArray = [];
    } else {
        commonGlobalState.btnflag = false;
        console.log('发送成功', response);
        globalState.dialogueArray = response.data.data.wenxinChatHistory.map((item, index) => {
            const speaker = index % 2 === 0 ? "user" : "assistant";
            return {
                speaker: speaker,
                message: speaker === "user" ? (item.displayUser || item.user) : item.assistant,
                avatarSrc: speaker === "user" ? "user-avatar.jpg" : "assistant-avatar.jpg",
                timestamp: new Date().toLocaleString()
            };
        });
        commonGlobalState.dialogVisible = false;
    }
}).catch(function (error) {
    console.error('发送失败', error);
});

export const getFeiman = () => Axios({
    method: 'get',
    url: '/api/student/chat/feiman/history',
    params: {
        "qid": globalState.history[0].qid,
    }
}).then(function (response) {
    if (response.data.data === undefined) {
        commonGlobalState.btnflag = true;
        globalState.dialogueArray = [];
    }
    else {
        console.log('发送成功', response);
        globalState.dialogueArray = response.data.data.wenxinChatHistory.map((item, index) => {
            const speaker = index % 2 === 0 ? "user" : "assistant";
            return {
                speaker: speaker,
                message: speaker === "user" ? (item.displayUser || item.user) : item.assistant,
                avatarSrc: speaker === "user" ? "user-avatar.jpg" : "assistant-avatar.jpg",
                timestamp: new Date().toLocaleString()
            };
        });
        commonGlobalState.dialogVisible = false;
    }
}).catch(function (error) {
    console.error('发送失败', error);
});
