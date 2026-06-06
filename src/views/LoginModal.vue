<template>
    <div class="text-center">
        <v-dialog v-model="commonGlobalState.showModal" max-width="40%" persistent>
            <v-card class="pa-4" elevation="2" style="border-radius: 16px;">
                <v-card-title class="d-flex justify-space-between align-center"
                    style="color: #a1c9e3;font-weight: bold;font-size: 25px;padding-right: 30px;">
                    <div class="logo-text">
                        <div class="main-title">Musee</div>
                        <div class="subtitle">Education</div>
                    </div>
                    {{ isLoginMode ? '登录' : '注册' }}
                </v-card-title>

                <v-card-text v-if="isLoginMode" style="margin: 30px 0px 10px 0px">
                    <v-text-field v-model="username" label="用户名" prepend-icon="mdi-account" outlined class="mb-4"
                        required></v-text-field>

                    <v-text-field v-model="password" label="密码" :type="showPassword ? 'text' : 'password'"
                        prepend-icon="mdi-lock" :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                        @click:append="showPassword = !showPassword" outlined required></v-text-field>
                </v-card-text>

                <!-- 注册表单 -->
                <v-card-text v-else style="margin: 30px 0px 10px 0px">
                    <v-text-field v-model="username" label="用户名" prepend-icon="mdi-account" outlined class="mb-4"
                        required></v-text-field>
                    <v-text-field v-model="email" label="邮箱" prepend-icon="mdi-email" outlined class="mb-4"
                        required></v-text-field>
                    <v-text-field v-model="password" label="密码" :type="showPassword ? 'text' : 'password'"
                        prepend-icon="mdi-lock" :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                        @click:append="showPassword = !showPassword" outlined required></v-text-field>
                </v-card-text>

                <v-card-actions style="padding: 0 20px;">
                    <v-btn text color="rgb(143, 156, 166)" @click="toggleMode">{{ isLoginMode ? '没有账号？注册' : '已有账号？登录' }}
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn text color="grey" @click="commonGlobalState.showModal = true" variant="flat">取消</v-btn>
                    <v-btn color="#388fca" depressed @click="handleLogin" variant="flat">
                        {{ isLoginMode ? '登录' : '注册' }}
                    </v-btn>
                </v-card-actions>
                <div style="padding: 0 25px;">
                    <div class="text-overline mb-4" style="font-size: 15px !important;margin-bottom: 0px !important">💎
                        专业版</div>

                    <div class="text-medium-emphasis mb-1">
                        Musee专业版提供更多功能和服务，包括：错题集功能、AI个性化分析、定制家庭教师服务等。
                    </div>
                </div>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { commonGlobalState } from '@/utils/commonStore.js';
import Axios from '@/axios/axiosPlugin';
import { fetchData } from '@/utils/common.js';
const isLoginMode = ref(true); // 切换登录和注册模式
const username = ref('');
const password = ref('');
const email = ref('');
const showPassword = ref(false); // 控制密码的可见性

function toggleMode() {
    isLoginMode.value = !isLoginMode.value;
}

function handleLogin() {
    try {
        if (isLoginMode.value) {
            Axios({
                method: 'get',
                url: '/api/student/login',
                params: {
                    username: username.value,
                    password: password.value,
                },
            }).then(function (response) {
                if (response.data.status === 1) {
                    localStorage.setItem('sid', response.data.data.sid);
                    localStorage.setItem('token', response.data.data.token);
                    localStorage.setItem('username', username.value);
                    commonGlobalState.showModal = false;
                    return fetchData();
                }
                alert(response.data.msg || '登录失败');
            }).catch(function (error) {
                console.log('登录失败', error);
            });

        } else {
            // 注册
            Axios({
                method: 'post',
                url: '/api/student/register',
                data: {
                    username: username.value,
                    email: email.value,
                    password: password.value,
                },
            }).then(function (response) {
                if (response.data.status === 1) {
                    alert('注册成功');
                    isLoginMode.value = !isLoginMode.value;
                } else {
                    alert('注册失败: ' + response.data.msg);
                }
                return fetchData();
            }).catch(function (error) {
                console.log('登录失败', error);
            });
        }
    } catch (error) {
        console.error('登录失败', error);
    }
}

</script>


<style scoped>
.v-card {
    background-color: #f5f5f5;
    /* 设置对话框的背景颜色为淡灰色 */
}

.header-container {
    display: flex;
    /* 使用弹性盒布局 */
    align-items: center;
    /* 项目在交叉轴上的对齐方式为居中 */
    justify-content: space-between;
    /* 项目在主轴上的对齐方式为两端对齐，项目之间的间隔都相等 */
}

.logo-text {
    color: black;
    /* 设置字体颜色为黑色 */
    font-size: xx-large;
    /* 设置字体尺寸为非常大 */
    font-weight: bolder;
    /* 设置字体的粗细为更粗 */
    padding: 10px 10px;
    /* 设置内边距 */
    display: flex;
    /* 使用弹性盒布局 */
}

.main-title {
    color: #388fca;
    /* 设置主标题的颜色 */
    font-weight: bold;
    /* 设置字体的粗细为粗体 */
}

.subtitle {
    color: #a1c9e3;
    /* 设置副标题的颜色 */
    font-weight: bold;
    /* 设置字体的粗细为粗体 */
}
</style>
