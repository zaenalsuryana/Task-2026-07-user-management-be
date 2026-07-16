import { ApiResponseDto } from '@common/dto/api-response.dto';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  Injectable,
  HttpStatus,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // If data is already in ApiResponseDto format, return as is
        if (data && typeof data === 'object' && 'statusCode' in data && 'message' in data) {
          return data;
        }

        const statusCode = response.statusCode;

        let message = 'Operation successful';

        switch (statusCode) {
          case HttpStatus.CREATED:
            message = 'Resource created successfully';
            break;

          case HttpStatus.OK:
            message = 'Operation successful';
            break;

          case HttpStatus.NO_CONTENT:
            message = 'Resource deleted successfully';
            break;
        }

        return {
          statusCode,
          message,
          data,
        };
      }),
    );
  }
}
