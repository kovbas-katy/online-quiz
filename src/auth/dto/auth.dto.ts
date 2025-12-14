import { UserDto } from "src/users/dto/user.dto";


export class AuthResponse {
    user: UserDto;
    accessToken: string;
    refreshToken: string;
}