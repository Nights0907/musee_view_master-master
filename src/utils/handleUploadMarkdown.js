import Axios from '@/axios/axiosPlugin.js'
import { commonGlobalState } from '@/utils/commonStore.js'

export const uploadMarkdownToMilvus = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        commonGlobalState.dialogVisible = true;
        commonGlobalState.warntitle = '正在上传文档并向量化...';
        const response = await Axios({
            method: 'post',
            url: '/api/document/upload',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response;
    } finally {
        commonGlobalState.dialogVisible = false;
    }
}


